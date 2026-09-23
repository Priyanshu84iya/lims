"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ChevronDown, ClipboardList, FileText, Printer, Search, UserPlus, Users, X } from "lucide-react";
import AppShell from "@/app/components/app-shell";
import InvoiceView, { InvoiceActions } from "@/app/components/invoice-view";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { Button } from "@/components/ui/button";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
const errorFieldClass = "mt-2 w-full rounded-lg border border-red-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

function sanitizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : "";
}

function CountryCodeSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((country) => country.code === value) || COUNTRIES.find((country) => country.iso === "IN")!;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = search.trim().toLowerCase();
  const matches = query
    ? COUNTRIES.filter((country) => country.name.toLowerCase().includes(query) || country.code.includes(query) || country.iso.toLowerCase().includes(query))
    : COUNTRIES;

  return (
    <div ref={containerRef} className="relative w-[112px] shrink-0">
      <button type="button" onClick={() => { setOpen((current) => !current); setSearch(""); }} className="flex w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-sm text-slate-900 outline-none transition hover:border-teal-500">
        <span className="truncate">{selected.code}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <input autoFocus className="w-full border-b border-slate-100 px-3 py-2.5 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search country or code..." />
          <div className="max-h-64 overflow-y-auto">
            {matches.length === 0 ? <p className="px-3 py-3 text-sm text-slate-500">No countries found.</p> : matches.map((country) => (
              <button key={`${country.iso}-${country.code}`} type="button" onClick={() => { onChange(country.code); setOpen(false); }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-teal-50 ${country.code === value ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-700"}`}>
                <span className="text-base leading-none">{flagEmoji(country.iso)}</span>
                <span className="flex-1 truncate">{country.name}</span>
                <span className="text-slate-500">{country.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
};

type Patient = {
  id: number;
  patientCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phoneCountryCode: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  referredBy: string | null;
  createdAt: string;
};

type CatalogTest = {
  code: string;
  name: string;
  category: string;
  description?: string;
  parametersCount: number;
  custom?: boolean;
};

type TestOrder = {
  id: number;
  orderNumber: string;
  referredBy: string | null;
  status: string;
  sampleCollectedAt: string | null;
  createdAt: string;
};

type OrderTest = { testCode: string; testName: string; category: string | null };

type CreatedInvoice = { id: number; invoiceNumber: string; missingPrices: string[] };

type Step = "PATIENT" | "TESTS" | "SLIP";

const STEPS: { id: Step; label: string }[] = [
  { id: "PATIENT", label: "Patient" },
  { id: "TESTS", label: "Test selection" },
  { id: "SLIP", label: "Booking slip" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${state === "done" ? "bg-teal-700 text-white" : state === "active" ? "bg-teal-100 text-teal-800 ring-2 ring-teal-600" : "bg-slate-100 text-slate-400"}`}>
              {index + 1}
            </span>
            <span className={`font-medium ${state === "todo" ? "text-slate-400" : "text-slate-700"}`}>{step.label}</span>
            {index < STEPS.length - 1 && <span className="mx-1 hidden h-px w-8 bg-slate-200 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ReceptionPage() {
  const [step, setStep] = useState<Step>("PATIENT");
  const [lab, setLab] = useState<Lab | null>(null);
  // ---- Step 1: patient search / registration ----
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  // ---- Step 2: test selection ----
  const [catalog, setCatalog] = useState<CatalogTest[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [selectedTestCodes, setSelectedTestCodes] = useState<string[]>([]);
  const [orderReferredBy, setOrderReferredBy] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [effectivePrices, setEffectivePrices] = useState<Record<string, string | null>>({});
  const [isOrdering, setIsOrdering] = useState(false);

  // ---- Step 3: booking slip / invoice ----
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [orderTests, setOrderTests] = useState<OrderTest[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [invoice, setInvoice] = useState<CreatedInvoice | null>(null);
  const [slipView, setSlipView] = useState<"SLIP" | "INVOICE">("SLIP");

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  useEffect(() => {
    fetch("/api/lab")
      .then((response) => response.json())
      .then((data) => { if (data.success) setLab(data.lab); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (step !== "PATIENT") return;
    setPatientsLoading(true);
    const params = patientSearch.trim() ? `?q=${encodeURIComponent(patientSearch.trim())}` : "";
    fetch(`/api/patients${params}`)
      .then((response) => response.json())
      .then((data) => { if (data.success) setPatients(data.patients); })
      .catch(() => undefined)
      .finally(() => setPatientsLoading(false));
  }, [step, patientSearch]);

  useEffect(() => {
    if (step !== "TESTS" || catalog.length > 0) return;
    setCatalogLoading(true);
    Promise.all([
      fetch("/api/tests").then((response) => response.json()),
      fetch("/api/custom-tests").then((response) => response.json()),
    ])
      .then(([registryData, customData]) => {
        const tests: CatalogTest[] = [];
        if (registryData.success) {
          for (const test of registryData.tests as { code: string; name: string; category: string; description?: string; parameters: unknown[] }[]) {
            tests.push({ code: test.code, name: test.name, category: test.category, description: test.description, parametersCount: test.parameters.length });
          }
        }
        if (customData.success) {
          for (const saved of customData.tests as { code: string; definition: string }[]) {
            try {
              const definition = JSON.parse(saved.definition) as { name: string; category?: string; parameters: unknown[] };
              tests.push({ code: saved.code, name: definition.name, category: definition.category || "Custom", parametersCount: definition.parameters.length, custom: true });
            } catch {
              // Skip malformed custom test definitions.
            }
          }
        }
        setCatalog(tests);
      })
      .catch(() => undefined)
      .finally(() => setCatalogLoading(false));
  }, [step, catalog.length]);

  useEffect(() => {
    if (step !== "TESTS") return;
    fetch("/api/pricing")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const prices: Record<string, string | null> = {};
          for (const test of data.tests as { testCode: string; effectivePrice: string | null }[]) {
            prices[test.testCode] = test.effectivePrice;
          }
          setEffectivePrices(prices);
        }
      })
      .catch(() => undefined);
  }, [step]);

  useEffect(() => {
    if (!order || !selectedPatient) {
      setQrDataUrl("");
      return;
    }
    const payload = JSON.stringify({
      orderNumber: order.orderNumber,
      patientId: selectedPatient.patientCode,
      name: selectedPatient.fullName,
      tests: orderTests.map((test) => test.testName),
      bookedAt: order.createdAt,
    });
    QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 256 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [order, selectedPatient, orderTests]);

  async function registerPatient() {
    setError("");
    const nextPhoneError = !phone ? "Phone number is required." : phone.length !== 10 ? "Phone number must be exactly 10 digits." : "";
    const nextEmailError = !email.trim() ? "Email is required." : !EMAIL_PATTERN.test(email.trim()) ? "Enter a valid email address." : "";
    setPhoneError(nextPhoneError);
    setEmailError(nextEmailError);
    if (!fullName.trim() || !dateOfBirth || !gender) {
      setError("Full name, date of birth and gender are required.");
      return;
    }
    if (nextPhoneError || nextEmailError) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, dateOfBirth, gender, phoneCountryCode, phone, email, address, referredBy }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to register patient.");
      choosePatient(data.patient);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong while registering the patient.");
    } finally {
      setIsSaving(false);
    }
  }

  function choosePatient(patient: Patient) {
    setSelectedPatient(patient);
    setOrderReferredBy(patient.referredBy || "");
    setError("");
    setStep("TESTS");
  }

  function toggleTest(code: string) {
    setSelectedTestCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    );
  }

  const trimmedDiscount = discountPercent.trim();
  const discountValid = trimmedDiscount === "" || (/^\d+(\.\d{1,2})?$/.test(trimmedDiscount) && Number(trimmedDiscount) <= 100);
  const discountError = discountValid ? "" : "Discount must be a percentage between 0 and 100.";

  async function confirmOrder() {
    if (!selectedPatient || selectedTestCodes.length === 0) return;
    setError("");
    if (discountError) {
      setError(discountError);
      return;
    }
    try {
      setIsOrdering(true);
      const response = await fetch("/api/test-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          selectedTests: selectedTestCodes,
          referredBy: orderReferredBy,
          discountPercent: discountPercent.trim() || "0",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to create test order.");
      setOrder(data.order);
      setOrderTests(data.tests || []);
      setInvoice(data.invoice || null);
      setSlipView("SLIP");
      setStep("SLIP");
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Something went wrong while creating the test order.");
    } finally {
      setIsOrdering(false);
    }
  }

  function printSlip() {
    window.print();
  }

  function resetWorkflow() {
    setStep("PATIENT");
    setSelectedPatient(null);
    setSelectedTestCodes([]);
    setTestSearch("");
    setOrderReferredBy("");
    setDiscountPercent("");
    setOrder(null);
    setOrderTests([]);
    setInvoice(null);
    setSlipView("SLIP");
    setError("");
  }

  function resetForm() {
    setFullName("");
    setDateOfBirth("");
    setGender("");
    setPhone("");
    setEmail("");
    setAddress("");
    setReferredBy("");
    setPhoneError("");
    setEmailError("");
    setError("");
  }

  // ---- Step 3: booking slip / invoice ----
  if (step === "SLIP" && order && selectedPatient) {
    const bookingDate = new Date(order.createdAt);

    if (slipView === "INVOICE" && invoice) {
      return (
        <AppShell title={`Invoice ${invoice.invoiceNumber}`}>
          <main className="px-5 py-7 lg:px-8">
            <div className="mx-auto max-w-[800px]">
              <InvoiceActions
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                onBack={() => setSlipView("SLIP")}
              />
              <InvoiceView invoiceId={invoice.id} lab={lab} />
            </div>
          </main>
        </AppShell>
      );
    }

    return (
      <AppShell title="Test booking slip">
        <main className="px-5 py-7 lg:px-8">
          <div className="mx-auto max-w-[800px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <Button variant="outline" onClick={resetWorkflow}>New booking</Button>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={printSlip}><Printer size={16} /> Print slip</Button>
                {invoice && (
                  <>
                    <Button variant="outline" onClick={() => setSlipView("INVOICE")}><FileText size={16} /> View invoice</Button>
                    <Button onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}><Printer size={16} /> Print invoice</Button>
                  </>
                )}
              </div>
            </div>

            {invoice && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 print:hidden">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Invoice generated</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                  {invoice.missingPrices.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      No price configured for: {invoice.missingPrices.join(", ")} — set prices in Catalog Pricing.
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf?download=1`, "_blank")}>Download invoice PDF</Button>
              </div>
            )}

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
                    <p className="text-sm text-slate-500">
                      {[lab?.address, lab?.city, lab?.state, lab?.pincode].filter(Boolean).join(", ")}
                    </p>
                    {lab?.phone && <p className="text-sm text-slate-500">{lab.phoneCountryCode} {lab.phone}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order number</p>
                  <p className="text-2xl font-bold text-teal-700">{order.orderNumber}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Patient ID</p>
                  <p className="text-lg font-bold text-slate-900">{selectedPatient.patientCode}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient name</p>
                  <p className="mt-1 text-lg font-semibold">{selectedPatient.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Age / Gender</p>
                  <p className="mt-1 text-lg font-semibold">{calculateAge(selectedPatient.dateOfBirth)} years / {selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="mt-1 text-lg font-semibold">{selectedPatient.phoneCountryCode} {selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Referred by</p>
                  <p className="mt-1 text-lg font-semibold">{order.referredBy || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Booking date</p>
                  <p className="mt-1 text-lg font-semibold">{bookingDate.toLocaleDateString()} {bookingDate.toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <p className="mt-1 text-lg font-semibold">Pending sample collection</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Booked tests ({orderTests.length})</p>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {orderTests.map((test) => (
                    <li key={test.testCode} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-medium text-slate-900">{test.testName}</span>
                      <span className="text-slate-500">{test.category || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex items-end justify-between border-t border-slate-200 pt-6">
                <div>
                  <p className="text-xs text-slate-500">Please bring this slip when visiting the laboratory for sample collection.</p>
                  <p className="mt-1 text-xs text-slate-400">Generated on {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block rounded-lg border border-slate-300 p-2">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt={`QR code for order ${order.orderNumber}`} className="h-16 w-16" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center bg-slate-100 text-[10px] font-mono text-slate-600">
                        {order.orderNumber}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Scan for order details</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  // ---- Step 2: test selection ----
  if (step === "TESTS" && selectedPatient) {
    const query = testSearch.trim().toLowerCase();
    // Live preview mirrors the server's paise-safe math (basis-point integers).
    const subtotalPaise = selectedTestCodes.reduce((sum, code) => {
      const price = effectivePrices[code];
      return price ? sum + Math.round(Number(price) * 100) : sum;
    }, 0);
    const discountBasisPoints = discountValid && trimmedDiscount !== "" ? Math.round(Number(trimmedDiscount) * 100) : 0;
    const discountPaise = Math.round((subtotalPaise * discountBasisPoints) / 10000);
    const payablePaise = subtotalPaise - discountPaise;
    const formatInr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const filteredCatalog = query
      ? catalog.filter((test) =>
          test.name.toLowerCase().includes(query) ||
          test.code.toLowerCase().includes(query) ||
          test.category.toLowerCase().includes(query)
        )
      : catalog;
    const categories = Array.from(new Set(filteredCatalog.map((test) => test.category)));

    return (
      <AppShell title="Reception / Test selection">
        <main className="px-5 py-7 lg:px-8">
          <div className="mx-auto max-w-[900px]">
            <StepIndicator current={step} />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Selected patient</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{selectedPatient.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPatient.patientCode} · {calculateAge(selectedPatient.dateOfBirth)} years · {selectedPatient.gender} · {selectedPatient.phoneCountryCode} {selectedPatient.phone}
                </p>
              </div>
              <Button variant="outline" onClick={() => { setSelectedPatient(null); setStep("PATIENT"); }}>Change patient</Button>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Which test(s) does the patient need?</h1>
              <p className="mt-2 text-sm text-slate-500">Search the catalog and select one or more tests for this order.</p>
            </div>

            {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    value={testSearch}
                    onChange={(event) => setTestSearch(event.target.value)}
                    placeholder="Search tests by name, code or category..."
                  />
                </div>

                <div className="mt-5 max-h-[480px] space-y-6 overflow-y-auto pr-1">
                  {catalogLoading && <p className="py-8 text-center text-sm text-slate-500">Loading test catalog...</p>}
                  {!catalogLoading && filteredCatalog.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">No tests found{query ? ` for "${testSearch.trim()}"` : ""}.</p>
                  )}
                  {!catalogLoading && categories.map((category) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{category}</p>
                      <div className="space-y-2">
                        {filteredCatalog.filter((test) => test.category === category).map((test) => {
                          const isSelected = selectedTestCodes.includes(test.code);
                          return (
                            <button
                              key={test.code}
                              type="button"
                              onClick={() => toggleTest(test.code)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${isSelected ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-slate-200 bg-white hover:border-teal-400"}`}
                            >
                              <span>
                                <span className="block text-sm font-semibold text-slate-900">{test.name}</span>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  {test.code} · {test.parametersCount} parameter{test.parametersCount === 1 ? "" : "s"}
                                  {test.custom ? " · custom" : ""}
                                </span>
                              </span>
                              <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${isSelected ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 text-transparent"}`}>
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Selected tests ({selectedTestCodes.length})</p>
                  {selectedTestCodes.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No tests selected yet. Choose at least one test to continue.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {selectedTestCodes.map((code) => {
                        const test = catalog.find((item) => item.code === code);
                        return (
                          <li key={code} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-medium text-slate-900">{test?.name || code}</span>
                            <button type="button" onClick={() => toggleTest(code)} className="text-slate-400 transition hover:text-red-600" aria-label={`Remove ${test?.name || code}`}>
                              <X size={14} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <label className="mt-4 block text-sm font-medium">
                    Referred by
                    <input className={fieldClass} value={orderReferredBy} onChange={(event) => setOrderReferredBy(event.target.value)} placeholder="Dr. A. Mensah" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Discount (%)
                    <input
                      className={discountError ? errorFieldClass : fieldClass}
                      value={discountPercent}
                      onChange={(event) => setDiscountPercent(event.target.value)}
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </label>
                  {discountError && <p className="mt-1.5 text-xs text-red-600">{discountError}</p>}
                  {selectedTestCodes.length > 0 && (
                    <div className="mt-4 space-y-1.5 rounded-lg bg-slate-50 px-3 py-3 text-sm">
                      <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatInr(subtotalPaise)}</span></div>
                      <div className="flex justify-between text-slate-600">
                        <span>Discount {trimmedDiscount !== "" && discountValid ? `(${trimmedDiscount}%)` : ""}</span>
                        <span>- {formatInr(discountPaise)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-950"><span>Payable</span><span>{formatInr(payablePaise)}</span></div>
                    </div>
                  )}
                  <Button className="mt-4 w-full" onClick={confirmOrder} disabled={isOrdering || selectedTestCodes.length === 0 || !discountValid}>
                    <ClipboardList size={16} /> {isOrdering ? "Creating order..." : "Confirm & create order"}
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  // ---- Step 1: patient search / registration ----
  return (
    <AppShell title="Reception / Patient registration">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <StepIndicator current={step} />

          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Reception</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Patient registration &amp; booking</h1>
            <p className="mt-2 text-sm text-slate-500">Search for an existing patient or register a new one, then book their tests.</p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-4 flex items-center gap-2">
              <Users size={18} className="text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Find an existing patient</h2>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search by patient ID, name, phone or email..."
              />
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {patientsLoading && <p className="py-4 text-center text-sm text-slate-500">Loading patients...</p>}
              {!patientsLoading && patients.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-500">
                  {patientSearch.trim() ? "No patients match your search. Register them below." : "No patients registered yet. Register the first one below."}
                </p>
              )}
              {!patientsLoading && patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => choosePatient(patient)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-teal-500 hover:bg-teal-50/40"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{patient.fullName}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {patient.patientCode} · {calculateAge(patient.dateOfBirth)} years · {patient.gender} · {patient.phoneCountryCode} {patient.phone}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-teal-700">Select →</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Or register a new patient</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium">Full name *<input className={fieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Amara Okafor" /></label>
              <label className="text-sm font-medium">Date of birth *<input className={fieldClass} type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label>
              <label className="text-sm font-medium">Age<input className={`${fieldClass} bg-slate-50`} value={age} readOnly placeholder="Calculated" /></label>
              <label className="text-sm font-medium">Gender *<select className={fieldClass} value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label>
              <label className="text-sm font-medium">Phone *<div className="mt-2 flex gap-2"><CountryCodeSelect value={phoneCountryCode} onChange={setPhoneCountryCode} /><input className={phoneError ? errorFieldClass : "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"} value={phone} onChange={(event) => { setPhone(sanitizePhone(event.target.value)); if (phoneError) setPhoneError(""); }} onPaste={(event) => { event.preventDefault(); setPhone((current) => sanitizePhone(current + event.clipboardData.getData("text"))); }} inputMode="numeric" maxLength={10} placeholder="10-digit number" /></div>{phoneError && <p className="mt-1.5 text-xs font-medium text-red-600">{phoneError}</p>}</label>
              <label className="text-sm font-medium">Email *<input className={emailError ? errorFieldClass : fieldClass} type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError(""); }} placeholder="patient@email.com" />{emailError && <p className="mt-1.5 text-xs font-medium text-red-600">{emailError}</p>}</label>
              <label className="text-sm font-medium">Referred by<input className={fieldClass} value={referredBy} onChange={(event) => setReferredBy(event.target.value)} placeholder="Dr. A. Mensah" /></label>
              <label className="text-sm font-medium md:col-span-2">Address<input className={fieldClass} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Patient address" /></label>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={registerPatient} disabled={isSaving}>
                <UserPlus size={16} /> {isSaving ? "Registering..." : "Register patient"}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
