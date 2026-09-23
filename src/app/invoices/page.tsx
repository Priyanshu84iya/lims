"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Printer, Search, Wallet } from "lucide-react";
import AppShell from "@/app/components/app-shell";
import InvoiceView, { InvoiceActions, InvoiceStatusBadge, PAYMENT_MODE_LABELS, formatInr } from "@/app/components/invoice-view";
import { Button } from "@/components/ui/button";

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
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
  createdAt: string;
  patientName: string;
  patientCode: string;
  orderNumber: string;
};

type Lab = {
  id: number;
  name: string;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phoneCountryCode: string | null;
  phone: string | null;
  gstNumber?: string | null;
  directorName?: string | null;
  signatureUrl?: string | null;
};

const PAYMENT_MODES = ["CASH", "UPI", "CARD", "ONLINE"] as const;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvoicesPage() {
  const [lab, setLab] = useState<Lab | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [viewingId, setViewingId] = useState<number | null>(null);

  // Record-payment dialog state.
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<string>("CASH");
  const [payTransactionId, setPayTransactionId] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    fetch("/api/lab")
      .then((response) => response.json())
      .then((data) => { if (data.success) setLab(data.lab); })
      .catch(() => undefined);
  }, []);

  function loadInvoices() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/invoices${suffix}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "Failed to load invoices.");
        setInvoices(data.invoices);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load invoices."))
      .finally(() => setLoading(false));
  }

  useEffect(loadInvoices, [search, paymentStatus, dateFrom, dateTo]);

  const totals = useMemo(() => {
    let billed = 0;
    let collected = 0;
    for (const invoice of invoices) {
      billed += Number(invoice.grandTotal);
      collected += Number(invoice.amountPaid);
    }
    return { billed, collected, outstanding: Math.max(billed - collected, 0) };
  }, [invoices]);

  async function recordPayment() {
    if (!payFor || !payAmount.trim()) return;
    setPayError("");
    setPaySaving(true);
    try {
      const response = await fetch(`/api/invoices/${payFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount.trim(), mode: payMode, transactionId: payTransactionId.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to record payment.");
      setPayFor(null);
      setPayAmount("");
      setPayTransactionId("");
      loadInvoices();
    } catch (saveError) {
      setPayError(saveError instanceof Error ? saveError.message : "Failed to record payment.");
    } finally {
      setPaySaving(false);
    }
  }

  // ---- Single invoice view ----
  if (viewingId !== null) {
    const viewed = invoices.find((invoice) => invoice.id === viewingId);
    return (
      <AppShell title={`Invoice ${viewed?.invoiceNumber || ""}`} eyebrow="Billing">
        <main className="px-5 py-7 lg:px-8">
          <div className="mx-auto max-w-[800px]">
            <InvoiceActions
              invoiceId={viewingId}
              invoiceNumber={viewed?.invoiceNumber || String(viewingId)}
              onBack={() => setViewingId(null)}
            />
            <InvoiceView invoiceId={viewingId} lab={lab} />
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Invoices" eyebrow="Billing">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Invoices</h1>
            <p className="mt-2 text-sm text-slate-500">
              Search invoices by number, patient name, patient ID or order number. Record additional payments and print or download invoices.
            </p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total billed</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatInr(totals.billed.toFixed(2))}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collected</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{formatInr(totals.collected.toFixed(2))}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding</p>
              <p className="mt-1 text-xl font-bold text-red-600">{formatInr(totals.outstanding.toFixed(2))}</p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice no, patient name, patient ID or order no..."
              />
            </div>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partially paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              From
              <input type="date" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              To
              <input type="date" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No invoices found. Invoices are generated automatically when an order is created at reception.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const balance = Math.max(Number(invoice.grandTotal) - Number(invoice.amountPaid), 0);
                      return (
                        <tr key={invoice.id} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-semibold text-teal-700">{invoice.invoiceNumber}</td>
                          <td className="px-4 py-3">
                            <span className="block font-medium text-slate-900">{invoice.patientName || "—"}</span>
                            <span className="text-xs text-slate-500">{invoice.patientCode}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{invoice.orderNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(invoice.createdAt)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatInr(invoice.grandTotal)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${balance > 0 ? "text-red-600" : "text-slate-400"}`}>{formatInr(balance.toFixed(2))}</td>
                          <td className="px-4 py-3"><InvoiceStatusBadge status={invoice.paymentStatus} /></td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => setViewingId(invoice.id)} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-teal-500 hover:text-teal-700" title="View invoice" aria-label={`View ${invoice.invoiceNumber}`}>
                                <Eye size={15} />
                              </button>
                              <button type="button" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-teal-500 hover:text-teal-700" title="Print invoice" aria-label={`Print ${invoice.invoiceNumber}`}>
                                <Printer size={15} />
                              </button>
                              <button type="button" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf?download=1`, "_blank")} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-teal-500 hover:text-teal-700" title="Download PDF" aria-label={`Download ${invoice.invoiceNumber}`}>
                                <Download size={15} />
                              </button>
                              {balance > 0 && (
                                <button type="button" onClick={() => { setPayFor(invoice); setPayError(""); setPayAmount(""); setPayTransactionId(""); }} className="rounded-lg border border-teal-200 bg-teal-50 p-2 text-teal-700 transition hover:bg-teal-100" title="Record payment" aria-label={`Record payment for ${invoice.invoiceNumber}`}>
                                  <Wallet size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {payFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">Record payment</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payFor.invoiceNumber} · Balance due {formatInr(Math.max(Number(payFor.grandTotal) - Number(payFor.amountPaid), 0).toFixed(2))}
            </p>

            {payError && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{payError}</div>}

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Amount (₹)
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  value={payAmount}
                  onChange={(event) => setPayAmount(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="e.g. 250.00"
                />
              </label>
              <label className="block text-sm font-medium">
                Payment mode
                <select
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500"
                  value={payMode}
                  onChange={(event) => setPayMode(event.target.value)}
                >
                  {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{PAYMENT_MODE_LABELS[mode]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Transaction ID (optional)
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  value={payTransactionId}
                  onChange={(event) => setPayTransactionId(event.target.value)}
                  placeholder="UPI reference / card slip no."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button onClick={recordPayment} disabled={paySaving || !payAmount.trim()}>
                <Wallet size={16} /> {paySaving ? "Recording..." : "Record payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
