"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  Search,
  Syringe,
} from "lucide-react";
import AppShell from "@/app/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

type Patient = {
  id: number;
  patientCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phoneCountryCode: string | null;
  phone: string | null;
};

type OrderResult = {
  id: number;
  parameterCode: string;
  parameterName: string;
  result: string | null;
  unit: string | null;
  referenceMin: string | null;
  referenceMax: string | null;
  referenceDisplay: string | null;
  inputType: string | null;
  status: string | null;
  sortOrder: number;
};

type OrderTest = {
  id: number;
  testCode: string;
  testName: string;
  category: string | null;
  status: string;
  results: OrderResult[];
};

type TestOrder = {
  id: number;
  orderNumber: string;
  patientId: number;
  referredBy: string | null;
  status: string;
  sampleCollectedAt: string | null;
  reportId: number | null;
  createdAt: string;
  patient?: Patient | null;
  tests?: OrderTest[];
};

type TestParameter = {
  code: string;
  name: string;
  unit: string;
  inputType?: string;
  required?: boolean;
  referenceRanges?: { min?: number; max?: number; display?: string }[];
};

type TestDefinition = {
  code: string;
  name: string;
  category: string;
  parameters: TestParameter[];
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  SAMPLE_COLLECTED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-teal-50 text-teal-700 border-teal-200",
  REPORT_GENERATED: "bg-emerald-600 text-white border-emerald-600",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SAMPLE_COLLECTED: "Sample Collected",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REPORT_GENERATED: "Report Generated",
};

const TEST_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-teal-50 text-teal-700",
};

const TEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function calculateAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : "";
}

export default function NewReportPage() {
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [definitions, setDefinitions] = useState<Map<string, TestDefinition>>(new Map());
  const [drafts, setDrafts] = useState<Record<number, Record<string, string>>>({});
  const [savingTestId, setSavingTestId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = useCallback(() => {
    setLoading(true);
    fetch("/api/test-orders")
      .then((response) => response.json())
      .then((data) => { if (data.success) setOrders(data.orders); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    Promise.all([
      fetch("/api/tests").then((response) => response.json()),
      fetch("/api/custom-tests").then((response) => response.json()),
    ])
      .then(([registryData, customData]) => {
        const map = new Map<string, TestDefinition>();
        if (registryData.success) {
          for (const test of registryData.tests as TestDefinition[]) map.set(test.code, test);
        }
        if (customData.success) {
          for (const saved of customData.tests as { code: string; definition: string }[]) {
            try {
              const definition = JSON.parse(saved.definition) as Omit<TestDefinition, "code">;
              map.set(saved.code, { ...definition, code: saved.code });
            } catch {
              // Skip malformed custom test definitions.
            }
          }
        }
        setDefinitions(map);
      })
      .catch(() => undefined);
  }, []);

  async function openOrder(orderId: number) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/test-orders/${orderId}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to load test order.");
      setSelectedOrder({ ...data.order, patient: data.patient, tests: data.tests });
      // Seed drafts from saved results.
      const nextDrafts: Record<number, Record<string, string>> = {};
      for (const test of data.tests as OrderTest[]) {
        const draft: Record<string, string> = {};
        for (const result of test.results) draft[result.parameterCode] = result.result || "";
        nextDrafts[test.id] = draft;
      }
      setDrafts(nextDrafts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong.");
    }
  }

  function setDraftValue(testId: number, code: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [testId]: { ...(current[testId] || {}), [code]: value },
    }));
  }

  async function saveResults(test: OrderTest, markCompleted: boolean) {
    if (!selectedOrder) return;
    setError("");
    setSuccess("");
    try {
      setSavingTestId(test.id);
      const response = await fetch(`/api/test-orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          results: drafts[test.id] || {},
          ...(markCompleted ? { testStatus: "COMPLETED" } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to save results.");
      setSelectedOrder({ ...data.order, patient: data.patient, tests: data.tests });
      const nextDrafts: Record<number, Record<string, string>> = {};
      for (const updated of data.tests as OrderTest[]) {
        const draft: Record<string, string> = {};
        for (const result of updated.results) draft[result.parameterCode] = result.result || "";
        nextDrafts[updated.id] = draft;
      }
      setDrafts(nextDrafts);
      setSuccess(markCompleted ? `${test.testName} marked completed.` : `Draft saved for ${test.testName}.`);
      loadOrders();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong.");
    } finally {
      setSavingTestId(null);
    }
  }

  async function collectSample() {
    if (!selectedOrder) return;
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/test-orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleCollected: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to record sample collection.");
      setSelectedOrder({ ...data.order, patient: data.patient, tests: data.tests });
      setSuccess("Sample collection recorded.");
      loadOrders();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong.");
    } finally {
      setSavingTestId(null);
    }
  }

  async function generateReport() {
    if (!selectedOrder) return;
    setError("");
    setSuccess("");
    try {
      setGenerating(true);
      const response = await fetch(`/api/test-orders/${selectedOrder.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to generate report.");
      setSuccess(`Report ${data.reportNumber} generated. Opening it now...`);
      loadOrders();
      window.open(`/reports/${data.reportId}`, "_self");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      order.orderNumber.toLowerCase().includes(query) ||
      (order.patient?.patientCode || "").toLowerCase().includes(query) ||
      (order.patient?.fullName || "").toLowerCase().includes(query)
    );
  }, [orders, search]);

  // ---- Detail view ----
  if (selectedOrder) {
    const patient = selectedOrder.patient;
    const allTestsComplete = (selectedOrder.tests || []).length > 0 && (selectedOrder.tests || []).every((test) => test.status === "COMPLETED");
    const isLocked = selectedOrder.status === "REPORT_GENERATED";

    return (
      <AppShell title="Create report / Order details">
        <main className="px-5 py-7 lg:px-8">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={() => { setSelectedOrder(null); loadOrders(); }}>
                <ArrowLeft size={16} /> Back to orders
              </Button>
              <Badge className={`${ORDER_STATUS_STYLES[selectedOrder.status] || ORDER_STATUS_STYLES.PENDING} border`}>
                {ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
              </Badge>
            </div>

            {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{success}</div>}

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Order {selectedOrder.orderNumber}</p>
                  <h1 className="mt-1 text-2xl font-semibold text-slate-950">{patient?.fullName || "Unknown patient"}</h1>
                  {patient && (
                    <p className="mt-1 text-sm text-slate-500">
                      {patient.patientCode} · {calculateAge(patient.dateOfBirth)} years · {patient.gender} · {patient.phoneCountryCode} {patient.phone}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-500">Referred by: {selectedOrder.referredBy || "—"}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Booked: {formatDate(selectedOrder.createdAt)}</p>
                  <p>Sample collected: {formatDate(selectedOrder.sampleCollectedAt)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {!selectedOrder.sampleCollectedAt && !isLocked && (
                  <Button onClick={collectSample}>
                    <Syringe size={16} /> Record sample collection
                  </Button>
                )}
                {allTestsComplete && !isLocked && (
                  <Button onClick={generateReport} disabled={generating}>
                    <FileText size={16} /> {generating ? "Generating..." : "Generate report"}
                  </Button>
                )}
                {isLocked && selectedOrder.reportId && (
                  <Button variant="outline" onClick={() => window.open(`/reports/${selectedOrder.reportId}`, "_self")}>
                    <FileText size={16} /> View report
                  </Button>
                )}
              </div>
            </section>

            <div className="space-y-6">
              {(selectedOrder.tests || []).map((test) => {
                const definition = definitions.get(test.testCode);
                const draft = drafts[test.id] || {};
                const requiredMissing = (definition?.parameters || [])
                  .filter((parameter) => parameter.required !== false)
                  .filter((parameter) => !(draft[parameter.code] || "").trim());

                return (
                  <section key={test.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FlaskConical size={18} className="text-teal-700" />
                        <h2 className="text-lg font-semibold text-slate-950">{test.testName}</h2>
                        <span className="text-xs text-slate-400">{test.testCode}</span>
                      </div>
                      <Badge className={TEST_STATUS_STYLES[test.status] || TEST_STATUS_STYLES.PENDING}>
                        {TEST_STATUS_LABELS[test.status] || test.status}
                      </Badge>
                    </div>

                    {!definition ? (
                      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        This test&apos;s definition is no longer available. Saved results are shown but cannot be edited.
                      </p>
                    ) : isLocked ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                              <th className="py-2 pr-4">Parameter</th>
                              <th className="py-2 pr-4">Result</th>
                              <th className="py-2 pr-4">Unit</th>
                              <th className="py-2">Reference range</th>
                            </tr>
                          </thead>
                          <tbody>
                            {test.results.map((result) => (
                              <tr key={result.id} className="border-b border-slate-100">
                                <td className="py-2.5 pr-4 font-medium text-slate-900">{result.parameterName}</td>
                                <td className="py-2.5 pr-4">{result.result || "—"}</td>
                                <td className="py-2.5 pr-4 text-slate-500">{result.unit || "—"}</td>
                                <td className="py-2.5 text-slate-500">{result.referenceDisplay || [result.referenceMin, result.referenceMax].filter(Boolean).join(" – ") || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          {definition.parameters.map((parameter) => {
                            const saved = test.results.find((result) => result.parameterCode === parameter.code);
                            return (
                              <label key={parameter.code} className="text-sm">
                                <span className="font-medium text-slate-900">
                                  {parameter.name}
                                  {parameter.required !== false && <span className="text-red-500"> *</span>}
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                  {parameter.unit}
                                  {saved?.referenceDisplay ? ` · Ref: ${saved.referenceDisplay}` : ""}
                                </span>
                                <input
                                  className={`${fieldClass} mt-1.5`}
                                  value={draft[parameter.code] || ""}
                                  onChange={(event) => setDraftValue(test.id, parameter.code, event.target.value)}
                                  inputMode={parameter.inputType === "NUMBER" ? "decimal" : undefined}
                                  placeholder={parameter.inputType === "NUMBER" ? "Numeric value" : "Enter result"}
                                  disabled={isLocked}
                                />
                              </label>
                            );
                          })}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <p className="text-xs text-slate-500">
                            {requiredMissing.length > 0
                              ? `${requiredMissing.length} required value(s) still missing.`
                              : "All required values entered."}
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => saveResults(test, false)} disabled={savingTestId === test.id}>
                              Save draft
                            </Button>
                            <Button
                              onClick={() => saveResults(test, true)}
                              disabled={savingTestId === test.id || requiredMissing.length > 0}
                            >
                              <CheckCircle2 size={16} /> {savingTestId === test.id ? "Saving..." : "Mark completed"}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  // ---- List view ----
  return (
    <AppShell title="Create report">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Laboratory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create report</h1>
            <p className="mt-2 text-sm text-slate-500">
              Open a Reception-registered order to enter results and finalize the report. Patients and investigations are booked at Reception.
            </p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="relative mb-6">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by order number, patient name or patient ID..."
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <ClipboardList size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                {search.trim() ? "No orders match your search." : "No test orders yet. Register a patient and book investigations at Reception."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openOrder(order.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-500"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-teal-700">{order.orderNumber}</span>
                      <Badge className={`${ORDER_STATUS_STYLES[order.status] || ORDER_STATUS_STYLES.PENDING} border`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-base font-semibold text-slate-950">{order.patient?.fullName || "Unknown patient"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {order.patient?.patientCode} · Booked {formatDate(order.createdAt)}
                      {order.tests && order.tests.length > 0 ? ` · ${order.tests.length} test(s)` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-teal-700">Open →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
