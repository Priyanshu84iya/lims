"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  AI_DISCLAIMER,
  calculateAge,
  formatDateTime,
  labAddressLine,
  referenceText,
  type LabInfo,
  type ReportRecord,
  type ReportResult,
  type ReportTest,
} from "./report-data";
import { isCriticalResult, parseAiAnalysis, statusLabel, type AiAnalysis } from "@/lib/ai-analysis";

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          height: 30,
          width: 1.4,
        });
      } catch {
        // invalid barcode input: leave blank
      }
    }
  }, [value]);
  return <svg ref={ref} className="report-barcode-svg" />;
}

function PatientRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="patient-row">
      <div className="patient-label">{label}</div>
      <div className="patient-colon">:</div>
      <div className="patient-value">{value || "-"}</div>
    </div>
  );
}

/* Rough row-height budget in mm. A4 usable height after header (27mm),
   location (28mm), patient box (~22mm), footer (18mm) and margins. */
const PAGE_BUDGET_MM = 190;
const PANEL_HEADER_MM = 10;
const PARAM_ROW_MM = 6;
const AI_SECTION_MM = 70;

export function paginateTests(report: ReportRecord, analysis?: string): ReportTest[][] {
  const pages: ReportTest[][] = [];
  let current: ReportTest[] = [];
  let used = 0;

  for (const test of report.tests) {
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

function statusClass(result: ReportResult) {
  const status = statusLabel(result);
  if (isCriticalResult(result)) return "status-critical";
  if (status === "LOW" || status === "HIGH" || status === "ABNORMAL") return "status-abnormal";
  if (status === "PENDING") return "status-pending";
  return "status-normal";
}

function AiSectionBody({ analysis }: { analysis: AiAnalysis }) {
  const hasAbnormal = analysis.abnormalFindings.length > 0;
  return (
    <div className="ai-body">
      <div className="ai-subsection">
        <div className="ai-heading">Abnormal Findings</div>
        {hasAbnormal ? (
          analysis.abnormalFindings.map((finding, index) => (
            <div className="ai-finding" key={`abn-${index}`}>
              <div className={`ai-finding-name${finding.status === "LOW" || finding.status === "HIGH" ? " ai-finding-abnormal" : ""}`}>
                {finding.parameter}: {finding.value}{finding.unit ? ` ${finding.unit}` : ""}
              </div>
              {finding.reference ? <div className="ai-finding-line">Reference Range: {finding.reference}</div> : null}
              {finding.status ? <div className={`ai-finding-line ai-status-${finding.status.toLowerCase()}`}>Status: {finding.status}</div> : null}
              {finding.note ? <div className="ai-finding-note">{finding.note}</div> : null}
            </div>
          ))
        ) : (
          <div className="ai-finding">No abnormal findings were identified in this report.</div>
        )}
      </div>

      {analysis.normalFindings.length > 0 ? (
        <div className="ai-subsection">
          <div className="ai-heading">Normal Findings</div>
          {analysis.normalFindings.map((finding, index) => (
            <div className="ai-finding" key={`nrm-${index}`}>
              <div className="ai-finding-name">
                {finding.parameter}: {finding.value}{finding.unit ? ` ${finding.unit}` : ""}
                {finding.reference ? ` (Ref: ${finding.reference})` : ""}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {analysis.possibleConcerns.length > 0 ? (
        <div className="ai-subsection">
          <div className="ai-heading">Possible Health Concerns / Symptoms</div>
          <ul className="ai-list">
            {analysis.possibleConcerns.map((item, index) => <li key={`cnc-${index}`}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      {analysis.recommendedNextSteps.length > 0 ? (
        <div className="ai-subsection">
          <div className="ai-heading">Recommended Next Steps</div>
          <ul className="ai-list">
            {analysis.recommendedNextSteps.map((item, index) => <li key={`stp-${index}`}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      {analysis.whenToConsultDoctor.length > 0 ? (
        <div className="ai-subsection">
          <div className="ai-heading">When to Consult a Doctor</div>
          <ul className="ai-list">
            {analysis.whenToConsultDoctor.map((item, index) => <li key={`doc-${index}`}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ReportPage({
  report,
  lab,
  analysis,
  pageNumber,
  totalPages,
  pageTests,
  showPatientBox,
}: {
  report: ReportRecord;
  lab: LabInfo;
  analysis?: string;
  pageNumber: number;
  totalPages: number;
  pageTests: ReportTest[];
  showPatientBox: boolean;
}) {
  const patient = report.patient;
  const collected = report.sampleCollectedAt;
  const reported = report.reportDate;
  const parsedAnalysis = analysis ? parseAiAnalysis(analysis) : undefined;

  return (
    <div className="report-page">
      <header className="report-header">
        <div className="report-logo-area">
          {lab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="report-logo" src={lab.logoUrl} alt={lab.name} />
          ) : (
            <div className="report-logo report-logo-fallback">{lab.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="report-brand">{lab.name}</div>
        </div>

        <div className="report-divider" />

        <div className="report-contact">
          <div>Clinical Pathology &amp; Laboratory Medicine</div>
          <div>{labAddressLine(lab)}</div>
          <div>Tel: {lab.phone ? `${lab.phoneCountryCode || ""} ${lab.phone}`.trim() : "-"}</div>
          <div>Email: {lab.email || "-"}</div>
          <div>Web: {lab.website || "-"}</div>
        </div>
      </header>

      {showPatientBox ? (
        <>
          <section className="report-location">
            <div className="report-lab-info">
              <div>{lab.name}</div>
              <div>{lab.address || "-"}</div>
              <div>{[lab.city, lab.state].filter(Boolean).join(", ") || "-"}</div>
              <div>{[lab.city, lab.pincode].filter(Boolean).join(" - ") || "-"}</div>
            </div>

            <div className="report-doctor">
              <div>{lab.directorName || "-"}</div>
              <div>{lab.directorQualification || ""}</div>
              <div className="report-doctor-title">MEDICAL DIRECTOR</div>
            </div>

            <div className="report-doctor">
              <div>{lab.directorName || "-"}</div>
              <div>{lab.directorQualification || ""}</div>
              <div className="report-doctor-title">CONSULTANT</div>
            </div>
          </section>

          <section className="patient-box">
            <div className="patient-column">
              <PatientRow label="Name" value={patient?.fullName || "-"} />
              <PatientRow label="Lab No." value={report.reportNumber} />
              <PatientRow label="A/c Status" value="ACTIVE" />
            </div>

            <div className="patient-column">
              <PatientRow label="Age" value={patient ? calculateAge(patient.dateOfBirth) : "-"} />
              <PatientRow label="Gender" value={patient?.gender || "-"} />
              <PatientRow label="Ref By" value={report.referredBy || "-"} />
            </div>

            <div className="patient-column">
              <PatientRow label="Collected" value={formatDateTime(collected)} />
              <PatientRow label="Received" value={formatDateTime(collected)} />
              <PatientRow label="Reported" value={formatDateTime(reported)} />
            </div>

            <div className="patient-column">
              <PatientRow label="Report Status" value={report.status} />
            </div>
          </section>
        </>
      ) : null}

      <section className="results-wrapper">
        {pageTests.length > 0 ? (
        <table className="results-table">
          <thead>
            <tr>
              <th className="test-name">Test Name</th>
              <th className="result-value">Result</th>
              <th className="units">Units</th>
              <th className="reference-range">Bio. Ref. Interval</th>
              <th className="status-col">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageTests.map((test) => (
              <Fragment key={test.id}>
                <tr>
                  <td className="test-name">
                    <div className="panel-title">{test.testName}</div>
                    <div className="test-method">{test.category || "Pathology"}</div>
                  </td>
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
                {test.results.map((result) => {
                  const critical = isCriticalResult(result);
                  const abnormal = critical || result.status === "HIGH" || result.status === "LOW" || result.status === "ABNORMAL";
                  return (
                    <tr key={`${test.id}-${result.parameterName}`}>
                      <td>{result.parameterName}</td>
                      <td className={`result-value${abnormal ? " result-abnormal" : ""}${critical ? " result-critical" : ""}`}>{result.result || "Pending"}</td>
                      <td>{result.unit || "-"}</td>
                      <td>{referenceText(result)}</td>
                      <td className={`status-cell ${statusClass(result)}`}>{statusLabel(result)}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        ) : null}

        {analysis && pageNumber === totalPages ? (
          <div className="ai-section">
            <div className="ai-title">AI-Assisted Health Information</div>
            <div className="ai-disclaimer">{AI_DISCLAIMER}</div>
            {parsedAnalysis ? <AiSectionBody analysis={parsedAnalysis} /> : null}
          </div>
        ) : null}
      </section>

      <footer className="report-footer">
        {lab.signatureUrl ? (
          <div className="signature-area">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="signature-img" src={lab.signatureUrl} alt="Signature" />
            <div className="signature-label">Authorized Signatory</div>
          </div>
        ) : null}
        <div className="barcode">
          <Barcode value={report.reportNumber.replace(/[^A-Za-z0-9-]/g, "")} />
        </div>
        <div className="page-number">
          Page {pageNumber} of {totalPages}
        </div>
      </footer>
    </div>
  );
}

export function ReportDocument({
  report,
  lab,
  analysis,
}: {
  report: ReportRecord;
  lab: LabInfo;
  analysis?: string;
}) {
  const pages = paginateTests(report, analysis);
  return (
    <>
      {pages.map((pageTests, index) => (
        <ReportPage
          key={index}
          report={report}
          lab={lab}
          analysis={analysis}
          pageNumber={index + 1}
          totalPages={pages.length}
          pageTests={pageTests}
          showPatientBox={index === 0}
        />
      ))}
    </>
  );
}

export function useReportPages(report: ReportRecord | null, analysis: string) {
  const [pages, setPages] = useState(1);
  useEffect(() => {
    if (!report) return;
    const rows = report.tests.reduce((sum, test) => sum + 1 + test.results.length, 0);
    const estimated = Math.max(1, Math.ceil((rows * 6 + (analysis ? 60 : 0)) / 240));
    setPages(estimated);
  }, [report, analysis]);
  return pages;
}
