import { chromium } from "playwright-core";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import { calculateAge } from "@/lib/laboratory/test-order";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

function formatInr(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `₹${value}`;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  ONLINE: "Online",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "PAID",
  PARTIAL: "PARTIALLY PAID",
  UNPAID: "UNPAID",
};

const INVOICE_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; font-size: 11px; }
.page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; position: relative; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 5mm; }
.lab-block { display: flex; gap: 4mm; align-items: center; }
.logo { width: 18mm; height: 18mm; object-fit: contain; border-radius: 2mm; }
.logo-fallback { width: 18mm; height: 18mm; border-radius: 2mm; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; }
.lab-name { font-size: 17px; font-weight: bold; color: #0f172a; }
.lab-detail { font-size: 9.5px; color: #475569; margin-top: 0.6mm; }
.invoice-title-block { text-align: right; }
.invoice-title { font-size: 22px; font-weight: bold; color: #0f766e; letter-spacing: 2px; }
.invoice-number { font-size: 12px; font-weight: bold; margin-top: 1mm; }
.invoice-date { font-size: 9.5px; color: #475569; margin-top: 0.6mm; }
.status-badge { display: inline-block; margin-top: 1.5mm; padding: 1mm 3mm; border-radius: 1mm; font-size: 9px; font-weight: bold; letter-spacing: 1px; }
.status-paid { background: #dcfce7; color: #166534; }
.status-partial { background: #fef3c7; color: #92400e; }
.status-unpaid { background: #fee2e2; color: #991b1b; }
.bill-to { margin-top: 6mm; display: flex; gap: 6mm; }
.bill-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 1.5mm; padding: 3.5mm 4mm; background: #f8fafc; }
.bill-card h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; margin-bottom: 1.5mm; }
.bill-line { font-size: 10px; color: #334155; margin-top: 0.5mm; }
.bill-line strong { color: #0f172a; }
table.items { width: 100%; border-collapse: collapse; margin-top: 6mm; }
table.items th { background: #0f766e; color: #fff; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2.5mm 3mm; text-align: left; }
table.items th.right, table.items td.right { text-align: right; }
table.items td { border-bottom: 1px solid #e2e8f0; padding: 2.5mm 3mm; font-size: 10.5px; }
table.items tr:nth-child(even) td { background: #f8fafc; }
.summary-row { display: flex; justify-content: space-between; margin-top: 1.2mm; font-size: 10.5px; }
.summary-row.total { border-top: 2px solid #0f172a; padding-top: 2mm; margin-top: 2mm; font-size: 13px; font-weight: bold; }
.summary-row.balance { color: #b91c1c; font-weight: bold; }
.summary-wrap { margin-top: 5mm; display: flex; gap: 8mm; }
.summary-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 1.5mm; padding: 3.5mm 4mm; }
.summary-card h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; margin-bottom: 2mm; }
.payments-table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
.payments-table th { background: #f1f5f9; font-size: 8.5px; text-transform: uppercase; padding: 1.5mm 2mm; text-align: left; color: #475569; }
.payments-table td { border-bottom: 1px solid #e2e8f0; font-size: 9.5px; padding: 1.5mm 2mm; }
.terms { margin-top: 6mm; border-top: 1px solid #e2e8f0; padding-top: 3mm; }
.terms h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 1.5mm; }
.terms p { font-size: 8.5px; color: #64748b; margin-top: 0.8mm; white-space: pre-line; }
.footer-block { margin-top: 8mm; display: flex; justify-content: space-between; align-items: flex-end; }
.signature { text-align: center; }
.signature img { height: 12mm; max-width: 40mm; object-fit: contain; }
.signature-line { border-top: 1px solid #334155; margin-top: 1mm; padding-top: 1mm; font-size: 9px; font-weight: bold; }
.signature-sub { font-size: 8px; color: #64748b; }
.thanks { margin-top: 6mm; text-align: center; font-size: 10px; font-weight: bold; color: #0f766e; letter-spacing: 1px; }
.page-footer { position: absolute; bottom: 8mm; left: 14mm; right: 14mm; border-top: 1px solid #e2e8f0; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
`;

interface InvoiceRow {
  id: number;
  invoiceNumber: string;
  labId: number;
  patientId: number;
  testOrderId: number;
  subtotal: string;
  discountPercent: string;
  discount: string;
  tax: string;
  grandTotal: string;
  amountPaid: string;
  paymentMode: string | null;
  paymentStatus: string;
  generatedBy: string;
  sampleType: string | null;
  terms: string | null;
  status: string;
  createdAt: string;
}

interface LabRow {
  id: number;
  name: string;
  email: string | null;
  phoneCountryCode: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  registrationNumber: string | null;
  gstNumber: string | null;
  website: string | null;
  directorName: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
}

interface PatientRow {
  id: number;
  patientCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phoneCountryCode: string | null;
  phone: string | null;
  address: string | null;
}

interface OrderRow {
  id: number;
  orderNumber: string;
  referredBy: string | null;
  sampleCollectedAt: string | null;
}

interface ItemRow {
  id: number;
  testCode: string;
  testName: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

interface PaymentRow {
  id: number;
  amount: string;
  mode: string;
  transactionId: string | null;
  receivedBy: string;
  createdAt: string;
}

function renderInvoiceHtml(
  invoice: InvoiceRow,
  lab: LabRow,
  patient: PatientRow | null,
  order: OrderRow | null,
  items: ItemRow[],
  payments: PaymentRow[],
  logoDataUri: string | null,
  signatureDataUri: string | null
) {
  const logo = logoDataUri
    ? `<img class="logo" src="${escapeHtml(logoDataUri)}" alt="${escapeHtml(lab.name)}" />`
    : `<div class="logo-fallback">${escapeHtml((lab.name || "L").charAt(0).toUpperCase())}</div>`;

  const statusKey = invoice.paymentStatus || "UNPAID";
  const statusClass = statusKey === "PAID" ? "status-paid" : statusKey === "PARTIAL" ? "status-partial" : "status-unpaid";

  const itemRows = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.testName)}</td>
      <td>${escapeHtml(item.testCode)}</td>
      <td class="right">${item.quantity}</td>
      <td class="right">${formatInr(item.unitPrice)}</td>
      <td class="right">${formatInr(item.amount)}</td>
    </tr>`).join("");

  const paymentRows = payments.length
    ? payments.map((payment) => `
        <tr>
          <td>${formatDateTime(payment.createdAt)}</td>
          <td>${escapeHtml(PAYMENT_MODE_LABELS[payment.mode] || payment.mode)}</td>
          <td>${escapeHtml(payment.transactionId || "-")}</td>
          <td>${escapeHtml(payment.receivedBy)}</td>
          <td style="text-align:right">${formatInr(payment.amount)}</td>
        </tr>`).join("")
    : `<tr><td colspan="5" style="color:#94a3b8">No payments recorded yet.</td></tr>`;

  const grandTotal = Number(invoice.grandTotal);
  const amountPaid = Number(invoice.amountPaid);
  const balance = grandTotal - amountPaid > 0 ? formatInr((grandTotal - amountPaid).toFixed(2)) : "₹0.00";

  const signature = signatureDataUri
    ? `<img src="${escapeHtml(signatureDataUri)}" alt="Signature" />`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>${INVOICE_CSS}</style></head>
<body>
<div class="page">
  <div class="header">
    <div class="lab-block">
      ${logo}
      <div>
        <div class="lab-name">${escapeHtml(lab.name || "Laboratory")}</div>
        <div class="lab-detail">${escapeHtml([lab.address, lab.city, lab.state, lab.pincode].filter(Boolean).join(", ") || "-")}</div>
        <div class="lab-detail">${escapeHtml([lab.phoneCountryCode, lab.phone].filter(Boolean).join(" "))}</div>
        ${lab.email ? `<div class="lab-detail">${escapeHtml(lab.email)}</div>` : ""}
        ${lab.website ? `<div class="lab-detail">${escapeHtml(lab.website)}</div>` : ""}
        ${lab.gstNumber ? `<div class="lab-detail">GSTIN: ${escapeHtml(lab.gstNumber)}</div>` : ""}
        ${lab.registrationNumber ? `<div class="lab-detail">Reg. No: ${escapeHtml(lab.registrationNumber)}</div>` : ""}
      </div>
    </div>
    <div class="invoice-title-block">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${escapeHtml(invoice.invoiceNumber)}</div>
      <div class="invoice-date">Date: ${formatDate(invoice.createdAt)}</div>
      ${order ? `<div class="invoice-date">Order: ${escapeHtml(order.orderNumber)}</div>` : ""}
      <div class="status-badge ${statusClass}">${escapeHtml(PAYMENT_STATUS_LABELS[statusKey] || statusKey)}</div>
    </div>
  </div>

  <div class="bill-to">
    <div class="bill-card">
      <h3>Billed To</h3>
      <div class="bill-line"><strong>${escapeHtml(patient?.fullName || "-")}</strong></div>
      <div class="bill-line">Patient ID: ${escapeHtml(patient?.patientCode || "-")}</div>
      <div class="bill-line">${patient ? `${escapeHtml(patient.gender)} · ${calculateAge(patient.dateOfBirth)} years` : "-"}</div>
      <div class="bill-line">${escapeHtml([patient?.phoneCountryCode, patient?.phone].filter(Boolean).join(" ") || "-")}</div>
      ${patient?.address ? `<div class="bill-line">${escapeHtml(patient.address)}</div>` : ""}
    </div>
    <div class="bill-card">
      <h3>Sample &amp; Order Details</h3>
      <div class="bill-line">Sample type: ${escapeHtml(invoice.sampleType || "As applicable")}</div>
      <div class="bill-line">Collected: ${order?.sampleCollectedAt ? formatDateTime(order.sampleCollectedAt) : "Pending collection"}</div>
      <div class="bill-line">Referred by: ${escapeHtml(order?.referredBy || "-")}</div>
      <div class="bill-line">Billed by: ${escapeHtml(invoice.generatedBy)}</div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:8mm">S.No</th>
        <th>Investigation</th>
        <th style="width:22mm">Code</th>
        <th class="right" style="width:12mm">Qty</th>
        <th class="right" style="width:24mm">Price</th>
        <th class="right" style="width:26mm">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="summary-wrap">
    <div class="summary-card">
      <h3>Payment History</h3>
      <table class="payments-table">
        <thead>
          <tr><th>Date</th><th>Mode</th><th>Transaction ID</th><th>Received By</th><th style="text-align:right">Amount</th></tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>
    <div class="summary-card">
      <h3>Payment Summary</h3>
      <div class="summary-row"><span>Subtotal</span><span>${formatInr(invoice.subtotal)}</span></div>
      <div class="summary-row"><span>Discount${Number(invoice.discountPercent) > 0 ? ` (${Number(invoice.discountPercent)}%)` : ""}</span><span>- ${formatInr(invoice.discount)}</span></div>
      <div class="summary-row"><span>Tax</span><span>+ ${formatInr(invoice.tax)}</span></div>
      <div class="summary-row total"><span>Grand Total</span><span>${formatInr(invoice.grandTotal)}</span></div>
      <div class="summary-row"><span>Amount Paid</span><span>${formatInr(invoice.amountPaid)}</span></div>
      <div class="summary-row balance"><span>Balance Due</span><span>${balance}</span></div>
      ${invoice.paymentMode ? `<div class="summary-row" style="margin-top:2mm"><span>Payment mode</span><span>${escapeHtml(PAYMENT_MODE_LABELS[invoice.paymentMode] || invoice.paymentMode)}</span></div>` : ""}
    </div>
  </div>

  ${invoice.terms ? `<div class="terms"><h3>Terms &amp; Conditions</h3><p>${escapeHtml(invoice.terms)}</p></div>` : ""}

  <div class="footer-block">
    <div style="font-size:8.5px;color:#94a3b8;max-width:90mm">This is a computer-generated invoice and does not require a physical signature unless mandated by local regulations.</div>
    <div class="signature">
      ${signature}
      <div class="signature-line">${escapeHtml(lab.directorName || "Authorized Signatory")}</div>
      <div class="signature-sub">Authorized Signatory</div>
    </div>
  </div>

  <div class="thanks">Thank you for choosing our laboratory.</div>

  <div class="page-footer">
    <span>${escapeHtml(lab.name || "Laboratory")} · ${escapeHtml(invoice.invoiceNumber)}</span>
    <span>Generated ${formatDateTime(invoice.createdAt)}</span>
  </div>
</div>
</body>
</html>`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId)) {
      return Response.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }

    const invoice = await db.orm.public.Invoice.where({ id: invoiceId, labId: auth.labId }).first();
    if (!invoice) {
      return Response.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const lab = await db.orm.public.Lab.where({ id: auth.labId }).first();
    if (!lab) {
      return Response.json({ success: false, error: "Laboratory not found." }, { status: 404 });
    }

    const [patient, order, items, payments, logoDataUri, signatureDataUri] = await Promise.all([
      db.orm.public.Patient.where({ id: invoice.patientId }).first(),
      db.orm.public.TestOrder.where({ id: invoice.testOrderId }).first(),
      db.orm.public.InvoiceItem.where({ invoiceId: invoice.id }).orderBy((item) => item.id.asc()).all(),
      db.orm.public.InvoicePayment.where({ invoiceId: invoice.id }).orderBy((payment) => payment.id.asc()).all(),
      toDataUri(lab.logoUrl),
      toDataUri(lab.signatureUrl),
    ]);

    const html = renderInvoiceHtml(
      invoice as unknown as InvoiceRow,
      lab as unknown as LabRow,
      patient as unknown as PatientRow | null,
      order as unknown as OrderRow | null,
      items as unknown as ItemRow[],
      payments as unknown as PaymentRow[],
      logoDataUri,
      signatureDataUri
    );

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
      const download = new URL(request.url).searchParams.get("download") === "1";
      return new Response(Buffer.from(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.invoiceNumber}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("INVOICE PDF ERROR:", error);
    return Response.json({ success: false, error: "Failed to generate invoice PDF." }, { status: 500 });
  }
}
