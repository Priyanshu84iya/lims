import { chromium } from "playwright-core";
import { readFile } from "fs/promises";
import path from "path";
import { labAddressLine, referenceText, calculateAge, formatDateTime, AI_DISCLAIMER, type LabInfo, type ReportRecord, type ReportResult, type ReportTest } from "@/lib/report-render-data";
import { isCriticalResult, parseAiAnalysis, statusLabel, type AiAnalysis } from "@/lib/ai-analysis";

const PAGE_BUDGET_MM = 190;
const PANEL_HEADER_MM = 10;
const PARAM_ROW_MM = 6;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/* page.setContent() has no base URL, so relative /uploads/... srcs fail in the
   generated PDF. Convert local public files to data URIs before rendering. */
async function toDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith("/")) return url || null;
  try {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const data = await readFile(filePath);
    const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

function paginateTests(tests: ReportTest[], analysis?: string): ReportTest[][] {
  const pages: ReportTest[][] = [];
  let current: ReportTest[] = [];
  let used = 0;
  for (const test of tests) {
    const height = PANEL_HEADER_MM + test.results.length * PARAM_ROW_MM;
    if (current.length > 0 && used + height > PAGE_BUDGET_MM) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(test);
    used += height;
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);
  // AI section always starts on its own page
  if (analysis && pages[pages.length - 1].length > 0) {
    pages.push([]);
  }
  return pages;
}

function patientRow(label: string, value: string) {
  return `<div class="patient-row"><div class="patient-label">${escapeHtml(label)}</div><div class="patient-colon">:</div><div class="patient-value">${escapeHtml(value || "-")}</div></div>`;
}

function statusClass(result: ReportResult) {
  const status = statusLabel(result);
  if (isCriticalResult(result)) return "status-critical";
  if (status === "LOW" || status === "HIGH" || status === "ABNORMAL") return "status-abnormal";
  if (status === "PENDING") return "status-pending";
  return "status-normal";
}

function renderAiSection(analysis: AiAnalysis) {
  const finding = (f: { parameter: string; value: string; unit: string; reference: string; status: string; note?: string }, abnormal: boolean) => `
    <div class="ai-finding">
      <div class="ai-finding-name${abnormal ? " ai-finding-abnormal" : ""}">${escapeHtml(`${f.parameter}: ${f.value}${f.unit ? ` ${f.unit}` : ""}`)}</div>
      ${f.reference ? `<div class="ai-finding-line">Reference Range: ${escapeHtml(f.reference)}</div>` : ""}`
    + (f.status ? `<div class="ai-finding-line ai-status-${escapeHtml(f.status.toLowerCase())}">Status: ${escapeHtml(f.status)}</div>` : "")
    + (f.note ? `<div class="ai-finding-note">${escapeHtml(f.note)}</div>` : "")
    + `</div>`;
  const list = (items: string[]) => items.length
    ? `<ul class="ai-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  const subsection = (title: string, body: string) => body
    ? `<div class="ai-subsection"><div class="ai-heading">${escapeHtml(title)}</div>${body}</div>`
    : "";

  const abnormalBody = analysis.abnormalFindings.length
    ? analysis.abnormalFindings.map((f) => finding(f, true)).join("")
    : `<div class="ai-finding">No abnormal findings were identified in this report.</div>`;
  const normalBody = analysis.normalFindings.length
    ? analysis.normalFindings.map((f) => finding(f, false)).join("")
    : "";

  return `
    <div class="ai-subsection"><div class="ai-heading">Abnormal Findings</div>${abnormalBody}</div>
    ${subsection("Normal Findings", normalBody)}
    ${subsection("Possible Health Concerns / Symptoms", list(analysis.possibleConcerns))}
    ${subsection("Recommended Next Steps", list(analysis.recommendedNextSteps))}
    ${subsection("When to Consult a Doctor", list(analysis.whenToConsultDoctor))}`;
}

function renderPage(report: ReportRecord, lab: LabInfo, pageTests: ReportTest[], pageNumber: number, totalPages: number, analysis?: string, showPatientBox = true) {
  const patient = report.patient;
  const collected = report.sampleCollectedAt;
  const reported = report.reportDate;
  const parsedAnalysis = analysis ? parseAiAnalysis(analysis) : undefined;
  const logo = lab.logoUrl
    ? `<img class="report-logo" src="${escapeHtml(lab.logoUrl)}" alt="${escapeHtml(lab.name)}" />`
    : `<div class="report-logo report-logo-fallback">${escapeHtml(lab.name.charAt(0).toUpperCase())}</div>`;

  const signature = lab.signatureUrl
    ? `<div class="signature-area"><img class="signature-img" src="${escapeHtml(lab.signatureUrl)}" alt="Signature" /><div class="signature-label">Authorized Signatory</div></div>`
    : "";

  const testRows = pageTests.length === 0 ? "" : pageTests.map((test) => `
    <tr>
      <td class="test-name"><div class="panel-title">${escapeHtml(test.testName)}</div><div class="test-method">${escapeHtml(test.category || "Pathology")}</div></td>
      <td></td><td></td><td></td><td></td>
    </tr>
    ${test.results.map((result) => {
      const critical = isCriticalResult(result);
      const abnormal = critical || result.status === "HIGH" || result.status === "LOW" || result.status === "ABNORMAL";
      return `<tr><td>${escapeHtml(result.parameterName)}</td><td class="result-value${abnormal ? " result-abnormal" : ""}${critical ? " result-critical" : ""}">${escapeHtml(result.result || "Pending")}</td><td>${escapeHtml(result.unit || "-")}</td><td>${escapeHtml(referenceText(result))}</td><td class="status-cell ${statusClass(result)}">${escapeHtml(statusLabel(result))}</td></tr>`;
    }).join("")}
  `).join("");

  const patientBox = showPatientBox ? `
    <section class="report-location">
      <div class="report-lab-info">
        <div>${escapeHtml(lab.name)}</div>
        <div>${escapeHtml(lab.address || "-")}</div>
        <div>${escapeHtml([lab.city, lab.state].filter(Boolean).join(", ") || "-")}</div>
        <div>${escapeHtml([lab.city, lab.pincode].filter(Boolean).join(" - ") || "-")}</div>
      </div>
      <div class="report-doctor">
        <div>${escapeHtml(lab.directorName || "-")}</div>
        <div>${escapeHtml(lab.directorQualification || "")}</div>
        <div class="report-doctor-title">MEDICAL DIRECTOR</div>
      </div>
      <div class="report-doctor">
        <div>${escapeHtml(lab.directorName || "-")}</div>
        <div>${escapeHtml(lab.directorQualification || "")}</div>
        <div class="report-doctor-title">CONSULTANT</div>
      </div>
    </section>
    <section class="patient-box">
      <div class="patient-column">
        ${patientRow("Name", patient?.fullName || "-")}
        ${patientRow("Lab No.", report.reportNumber)}
        ${patientRow("A/c Status", "ACTIVE")}
      </div>
      <div class="patient-column">
        ${patientRow("Age", patient ? calculateAge(patient.dateOfBirth) : "-")}
        ${patientRow("Gender", patient?.gender || "-")}
        ${patientRow("Ref By", report.referredBy || "-")}
      </div>
      <div class="patient-column">
        ${patientRow("Collected", formatDateTime(collected))}
        ${patientRow("Received", formatDateTime(collected))}
        ${patientRow("Reported", formatDateTime(reported))}
      </div>
      <div class="patient-column">
        ${patientRow("Report Status", report.status)}
      </div>
    </section>` : "";

  const aiSection = analysis && pageNumber === totalPages ? `
    <div class="ai-section">
      <div class="ai-title">AI-Assisted Health Information</div>
      <div class="ai-disclaimer">${escapeHtml(AI_DISCLAIMER)}</div>
      ${parsedAnalysis ? renderAiSection(parsedAnalysis) : ""}
    </div>` : "";

  return `
  <div class="report-page">
    <header class="report-header">
      <div class="report-logo-area">${logo}<div class="report-brand">${escapeHtml(lab.name)}</div></div>
      <div class="report-divider"></div>
      <div class="report-contact">
        <div>Clinical Pathology &amp; Laboratory Medicine</div>
        <div>${escapeHtml(labAddressLine(lab))}</div>
        <div>Tel: ${escapeHtml(lab.phone ? `${lab.phoneCountryCode || ""} ${lab.phone}`.trim() : "-")}</div>
        <div>Email: ${escapeHtml(lab.email || "-")}</div>
        <div>Web: ${escapeHtml(lab.website || "-")}</div>
      </div>
    </header>
    ${patientBox}
    <section class="results-wrapper">
      ${pageTests.length > 0 ? `
      <table class="results-table">
        <thead><tr><th class="test-name">Test Name</th><th class="result-value">Result</th><th class="units">Units</th><th class="reference-range">Bio. Ref. Interval</th><th class="status-col">Status</th></tr></thead>
        <tbody>${testRows}</tbody>
      </table>` : ""}
      ${aiSection}
    </section>
    <footer class="report-footer">
      ${signature}
      <div class="barcode"><svg class="report-barcode-svg" data-barcode="${escapeHtml(report.reportNumber.replace(/[^A-Za-z0-9-]/g, ""))}"></svg></div>
      <div class="page-number">Page ${pageNumber} of ${totalPages}</div>
    </footer>
  </div>`;
}

function renderDocument(report: ReportRecord, lab: LabInfo, analysis?: string) {
  const pages = paginateTests(report.tests, analysis);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><style>${PDF_CSS}</style></head>
<body>
${pages.map((pageTests, index) => renderPage(report, lab, pageTests, index + 1, pages.length, analysis, index === 0)).join("")}
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script>
  document.querySelectorAll("svg[data-barcode]").forEach(function (svg) {
    try { JsBarcode(svg, svg.getAttribute("data-barcode"), { format: "CODE128", displayValue: false, margin: 0, height: 30, width: 1.4 }); } catch (e) {}
  });
</script>
</body></html>`;
}

const PDF_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #111; }
.report-page { position: relative; width: 210mm; height: 297mm; background: #fff; overflow: hidden; padding-bottom: 28mm; break-after: page; page-break-after: always; }
.report-page:last-child { break-after: auto; page-break-after: auto; }
.report-header { height: 27mm; background: #ffd51a; border-bottom: 1px solid #d5b400; display: flex; align-items: center; padding: 4mm 7mm; }
.report-logo-area { width: 52%; display: flex; align-items: center; }
.report-logo { width: 15mm; height: 19mm; margin-right: 4mm; object-fit: contain; }
.report-logo-fallback { display: flex; align-items: center; justify-content: center; background: #0057b8; color: #ffd51a; font-size: 22px; font-weight: bold; }
.report-brand { color: #0057b8; font-size: 25px; font-weight: bold; font-style: italic; white-space: nowrap; }
.report-divider { height: 19mm; width: 1px; background: #174f8e; margin: 0 7mm 0 3mm; }
.report-contact { flex: 1; color: #0057b8; font-size: 8px; line-height: 1.25; font-weight: 600; }
.report-location { padding: 6mm 12mm 3mm; min-height: 28mm; display: flex; justify-content: space-between; }
.report-lab-info { width: 42%; font-size: 9px; line-height: 1.55; font-weight: bold; }
.report-doctor { width: 25%; text-align: center; font-size: 8px; }
.report-doctor-title { color: #a71930; font-weight: bold; }
.patient-box { margin: 0 12mm; border: 1px solid #999; padding: 3mm 4mm; display: grid; grid-template-columns: 1fr 1fr; font-size: 9px; }
.patient-row { display: flex; margin-bottom: 3mm; }
.patient-label { width: 25mm; font-weight: bold; }
.patient-colon { width: 5mm; }
.patient-value { font-weight: bold; }
.results-wrapper { margin: 8mm 12mm 0; }
.results-table { width: 100%; border-collapse: collapse; font-size: 9px; }
.results-table th { text-align: left; padding: 3mm 2mm; border-bottom: 1px solid #222; font-size: 9px; }
.results-table td { padding: 1.9mm 2mm; vertical-align: middle; }
.test-name { width: 38%; }
.result-value { width: 18%; font-weight: bold; }
.result-abnormal { color: #b91c1c; }
.result-critical { color: #dc2626; font-weight: bold; text-decoration: underline; }
.units { width: 16%; }
.reference-range { width: 20%; }
.status-col { width: 8%; }
.status-cell { font-weight: bold; }
.status-abnormal { color: #b91c1c; }
.status-critical { color: #dc2626; font-weight: bold; text-decoration: underline; }
.status-pending { color: #64748b; }
.status-normal { color: #111; }
.panel-title { font-size: 11px; font-weight: bold; }
.test-method { font-size: 9px; margin-top: 1mm; }
.ai-section { margin-top: 8mm; border: 1px solid #ddd6fe; background: #faf5ff; padding: 4mm; }
.ai-title { font-size: 11px; font-weight: bold; color: #5b21b6; }
.ai-disclaimer { font-size: 8px; color: #7c3aed; font-style: italic; margin-top: 1mm; }
.ai-body { font-size: 9px; margin-top: 3mm; line-height: 1.55; }
.ai-subsection { margin-top: 3mm; }
.ai-heading { font-size: 10px; font-weight: bold; color: #5b21b6; margin-bottom: 1mm; }
.ai-finding { margin-bottom: 2mm; }
.ai-finding-name { font-weight: bold; }
.ai-finding-abnormal { color: #b91c1c; }
.ai-finding-line { margin-left: 3mm; }
.ai-finding-note { margin-left: 3mm; color: #444; }
.ai-status-low, .ai-status-high, .ai-status-abnormal { color: #b91c1c; font-weight: bold; }
.ai-status-normal { color: #166534; }
.ai-list { margin: 0; padding-left: 5mm; }
.ai-list li { margin-bottom: 1mm; }
.report-footer { position: absolute; bottom: 9mm; left: 12mm; right: 12mm; height: 18mm; display: flex; align-items: flex-end; justify-content: flex-end; }
.signature-area { position: absolute; left: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; }
.signature-img { height: 12mm; max-width: 35mm; object-fit: contain; }
.signature-label { font-size: 8px; font-weight: bold; border-top: 1px solid #111; padding-top: 1mm; margin-top: 1mm; min-width: 30mm; text-align: center; }
.barcode { width: 47mm; height: 8mm; margin-right: 21mm; }
.report-barcode-svg { width: 100%; height: 100%; }
.page-number { font-size: 9px; white-space: nowrap; }
`;

export type ReportPdfInput = {
  report: ReportRecord;
  lab: LabInfo;
  analysis?: string;
};

export async function generateReportPdf({ report, lab, analysis }: ReportPdfInput): Promise<Buffer> {
  const labInfo: LabInfo = {
    name: lab.name,
    email: lab.email,
    phoneCountryCode: lab.phoneCountryCode,
    phone: lab.phone,
    address: lab.address,
    city: lab.city,
    state: lab.state,
    pincode: lab.pincode,
    registrationNumber: lab.registrationNumber,
    licenseNumber: lab.licenseNumber,
    gstNumber: lab.gstNumber,
    website: lab.website,
    directorName: lab.directorName,
    directorQualification: lab.directorQualification,
    logoUrl: await toDataUri(lab.logoUrl),
    signatureUrl: await toDataUri(lab.signatureUrl),
  };

  const html = renderDocument(report, labInfo, analysis);

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}