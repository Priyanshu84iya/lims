"use client";

import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InvoiceDetail {
  invoice: {
    id: number;
    invoiceNumber: string;
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
    createdAt: string;
  };
  patient: {
    id: number;
    patientCode: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneCountryCode: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  order: {
    id: number;
    orderNumber: string;
    referredBy: string | null;
    sampleCollectedAt: string | null;
  } | null;
  items: {
    id: number;
    testCode: string;
    testName: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }[];
  payments: {
    id: number;
    amount: string;
    mode: string;
    transactionId: string | null;
    receivedBy: string;
    createdAt: string;
  }[];
}

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  ONLINE: "Online",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PARTIAL: "Partially paid",
  UNPAID: "Unpaid",
};

export function formatInr(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `₹${value}`;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : "";
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
    UNPAID: "bg-red-50 text-red-700 ring-red-600/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${styles[status] || styles.UNPAID}`}>
      {PAYMENT_STATUS_LABELS[status] || status}
    </span>
  );
}

// Renders a full invoice from the invoice detail API. Used by the reception
// flow and the invoice management page. Print-friendly via window.print().
export default function InvoiceView({ invoiceId, lab }: { invoiceId: number; lab: { name: string; logoUrl: string | null; address: string | null; city: string | null; state: string | null; pincode: string | null; phoneCountryCode: string | null; phone: string | null; gstNumber?: string | null; directorName?: string | null; signatureUrl?: string | null } | null }) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/invoices/${invoiceId}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || "Failed to load invoice.");
        setDetail(data as InvoiceDetail);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load invoice.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [invoiceId]);

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading invoice...</p>;
  }
  if (error || !detail) {
    return <p className="py-12 text-center text-sm text-red-600">{error || "Invoice not found."}</p>;
  }

  const { invoice, patient, order, items, payments } = detail;
  const grandTotal = Number(invoice.grandTotal);
  const amountPaid = Number(invoice.amountPaid);
  const balance = Math.max(grandTotal - amountPaid, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          {lab?.logoUrl ? (
            <img src={lab.logoUrl} alt={lab.name} className="size-16 rounded-lg object-contain" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-lg bg-teal-700 text-xl font-bold text-white">
              {lab?.name?.charAt(0) || "L"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{lab?.name || "Laboratory"}</h1>
            <p className="text-sm text-slate-500">{[lab?.address, lab?.city, lab?.state, lab?.pincode].filter(Boolean).join(", ")}</p>
            {lab?.phone && <p className="text-sm text-slate-500">{lab.phoneCountryCode} {lab.phone}</p>}
            {lab?.gstNumber && <p className="text-sm text-slate-500">GSTIN: {lab.gstNumber}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</p>
          <p className="text-2xl font-bold text-teal-700">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(invoice.createdAt)}</p>
          {order && <p className="text-xs text-slate-500">Order {order.orderNumber}</p>}
          <div className="mt-2"><InvoiceStatusBadge status={invoice.paymentStatus} /></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed to</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{patient?.fullName || "—"}</p>
          <p className="text-sm text-slate-500">Patient ID: {patient?.patientCode || "—"}</p>
          {patient && <p className="text-sm text-slate-500">{patient.gender} · {calculateAge(patient.dateOfBirth)} years</p>}
          {patient?.phone && <p className="text-sm text-slate-500">{patient.phoneCountryCode} {patient.phone}</p>}
          {patient?.address && <p className="text-sm text-slate-500">{patient.address}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sample &amp; order details</p>
          <p className="mt-1 text-sm text-slate-600">Sample type: {invoice.sampleType || "As applicable"}</p>
          <p className="text-sm text-slate-600">Collected: {order?.sampleCollectedAt ? formatDateTime(order.sampleCollectedAt) : "Pending collection"}</p>
          <p className="text-sm text-slate-600">Referred by: {order?.referredBy || "—"}</p>
          <p className="text-sm text-slate-600">Billed by: {invoice.generatedBy}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-teal-700 text-left text-xs uppercase tracking-wide text-white">
              <th className="px-3 py-2.5">S.No</th>
              <th className="px-3 py-2.5">Investigation</th>
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5 text-right">Qty</th>
              <th className="px-3 py-2.5 text-right">Price</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/60">
                <td className="px-3 py-2.5">{index + 1}</td>
                <td className="px-3 py-2.5 font-medium text-slate-900">{item.testName}</td>
                <td className="px-3 py-2.5 text-slate-500">{item.testCode}</td>
                <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right">{formatInr(item.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{formatInr(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment history</p>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">
                    {formatDateTime(payment.createdAt)} · {PAYMENT_MODE_LABELS[payment.mode] || payment.mode}
                    {payment.transactionId ? ` · ${payment.transactionId}` : ""}
                  </span>
                  <span className="font-semibold text-slate-900">{formatInr(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatInr(invoice.subtotal)}</span></div>
          <div className="mt-1.5 flex justify-between text-sm text-slate-600"><span>Discount{Number(invoice.discountPercent) > 0 ? ` (${Number(invoice.discountPercent)}%)` : ""}</span><span>- {formatInr(invoice.discount)}</span></div>
          <div className="mt-1.5 flex justify-between text-sm text-slate-600"><span>Tax</span><span>+ {formatInr(invoice.tax)}</span></div>
          <div className="mt-3 flex justify-between border-t-2 border-slate-900 pt-2 text-base font-bold text-slate-950"><span>Grand total</span><span>{formatInr(invoice.grandTotal)}</span></div>
          <div className="mt-1.5 flex justify-between text-sm text-slate-600"><span>Amount paid</span><span>{formatInr(invoice.amountPaid)}</span></div>
          <div className="mt-1.5 flex justify-between text-sm font-bold text-red-600"><span>Balance due</span><span>{formatInr(balance.toFixed(2))}</span></div>
          {invoice.paymentMode && (
            <div className="mt-2 flex justify-between text-sm text-slate-600"><span>Payment mode</span><span>{PAYMENT_MODE_LABELS[invoice.paymentMode] || invoice.paymentMode}</span></div>
          )}
        </div>
      </div>

      {invoice.terms && (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Terms &amp; conditions</p>
          <p className="mt-1.5 whitespace-pre-line text-xs text-slate-500">{invoice.terms}</p>
        </div>
      )}

      <div className="mt-8 flex items-end justify-between border-t border-slate-200 pt-6">
        <p className="text-xs text-slate-400">This is a computer-generated invoice.</p>
        <div className="text-center">
          {lab?.signatureUrl && <img src={lab.signatureUrl} alt="Signature" className="mx-auto h-10 object-contain" />}
          <p className="mt-1 border-t border-slate-400 pt-1 text-xs font-semibold text-slate-700">{lab?.directorName || "Authorized Signatory"}</p>
          <p className="text-[10px] text-slate-400">Authorized Signatory</p>
        </div>
      </div>

      <p className="mt-6 text-center text-sm font-semibold tracking-wide text-teal-700">Thank you for choosing our laboratory.</p>
    </div>
  );
}

// Action bar shown above the invoice (hidden when printing).
export function InvoiceActions({ invoiceId, invoiceNumber, onBack }: { invoiceId: number; invoiceNumber: string; onBack?: () => void }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    try {
      setDownloading(true);
      const response = await fetch(`/api/invoices/${invoiceId}/pdf?download=1`);
      if (!response.ok) throw new Error("Failed to generate PDF.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Could not download the invoice PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Print invoice</Button>
        <Button onClick={downloadPdf} disabled={downloading}><Download size={16} /> {downloading ? "Preparing PDF..." : "Download PDF"}</Button>
      </div>
    </div>
  );
}
