"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Save, Search, Sparkles, X } from "lucide-react";
import AppShell from "@/app/components/app-shell";
import { Button } from "@/components/ui/button";

type PricedTest = {
  testCode: string;
  testName: string;
  category: string;
  custom: boolean;
  suggestedPrice: string | null;
  configuredPrice: string | null;
  effectivePrice: string | null;
  priceSource: "LAB" | "SUGGESTED" | "UNSET";
};

const PAGE_SIZE = 12;

function formatInr(value: string | null): string {
  if (value === null) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `₹${value}`;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CatalogPricingPage() {
  const [tests, setTests] = useState<PricedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  // Draft price edits keyed by test code. Empty string means "remove override".
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaultsOverwrite, setDefaultsOverwrite] = useState(false);
  const [defaultsWorking, setDefaultsWorking] = useState(false);

  function loadPricing() {
    setLoading(true);
    fetch("/api/pricing")
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "Failed to load pricing.");
        setTests(data.tests);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load pricing."))
      .finally(() => setLoading(false));
  }

  useEffect(loadPricing, []);

  const categories = useMemo(
    () => Array.from(new Set(tests.map((test) => test.category))).sort(),
    [tests]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tests.filter((test) => {
      if (category && test.category !== category) return false;
      if (!query) return true;
      return (
        test.testName.toLowerCase().includes(query) ||
        test.testCode.toLowerCase().includes(query) ||
        test.category.toLowerCase().includes(query)
      );
    });
  }, [tests, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTests = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const dirtyCodes = useMemo(
    () => Object.entries(drafts)
      .filter(([code, value]) => {
        const test = tests.find((item) => item.testCode === code);
        if (!test) return false;
        const current = test.configuredPrice ?? "";
        return value !== current;
      })
      .map(([code]) => code),
    [drafts, tests]
  );

  useEffect(() => { setPage(1); }, [search, category]);

  function setDraft(code: string, value: string) {
    setDrafts((current) => ({ ...current, [code]: value.replace(/[^\d.]/g, "") }));
  }

  function resetDraft(code: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
  }

  async function savePrices() {
    if (dirtyCodes.length === 0) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const updates = dirtyCodes.map((code) => {
        const value = drafts[code].trim();
        return { testCode: code, price: value === "" ? null : value };
      });
      const response = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to save prices.");
      setTests(data.tests);
      setDrafts({});
      setNotice(`Saved prices for ${updates.length} test${updates.length === 1 ? "" : "s"}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save prices.");
    } finally {
      setSaving(false);
    }
  }

  async function applyDefaultPrices() {
    setError("");
    setNotice("");
    setDefaultsWorking(true);
    try {
      const response = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite: defaultsOverwrite }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to set default prices.");
      setTests(data.tests);
      setDrafts({});
      setDefaultsOpen(false);
      setNotice(
        defaultsOverwrite
          ? `Overwrote ${data.applied} test prices with the system-defined suggested prices.`
          : `Applied system-defined suggested prices to ${data.applied} test${data.applied === 1 ? "" : "s"} (${data.skipped} already had lab prices).`
      );
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to set default prices.");
    } finally {
      setDefaultsWorking(false);
    }
  }

  // Preview for the confirmation dialog.
  const defaultsPreview = useMemo(() => {
    const unset = tests.filter((test) => !test.custom && test.priceSource !== "LAB");
    const configured = tests.filter((test) => !test.custom && test.priceSource === "LAB");
    return { unsetCount: unset.length, configuredCount: configured.length };
  }, [tests]);

  return (
    <AppShell title="Catalog Pricing" eyebrow="Laboratory configuration">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Catalog Pricing</h1>
            <p className="mt-2 text-sm text-slate-500">
              Configure the prices your laboratory charges for each investigation. Tests without a lab-specific price use the
              system-defined suggested price as a fallback — a missing price is never treated as ₹0.
            </p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by test name, code or category..."
              />
            </div>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <Button variant="outline" onClick={() => setDefaultsOpen(true)}>
              <Sparkles size={16} /> Set Default Prices
            </Button>
            <Button onClick={savePrices} disabled={saving || dirtyCodes.length === 0}>
              <Save size={16} /> {saving ? "Saving..." : `Save changes${dirtyCodes.length ? ` (${dirtyCodes.length})` : ""}`}
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading catalog pricing...</p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No tests match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Investigation</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Suggested price</th>
                      <th className="px-4 py-3">Your price (₹)</th>
                      <th className="px-4 py-3 text-right">Effective price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageTests.map((test) => {
                      const draft = drafts[test.testCode] ?? test.configuredPrice ?? "";
                      const isDirty = dirtyCodes.includes(test.testCode);
                      return (
                        <tr key={test.testCode} className={`border-b border-slate-100 ${isDirty ? "bg-amber-50/60" : ""}`}>
                          <td className="px-4 py-3">
                            <span className="block font-semibold text-slate-900">{test.testName}</span>
                            <span className="text-xs text-slate-500">{test.testCode}{test.custom ? " · custom test" : ""}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{test.category}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{formatInr(test.suggestedPrice)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                className={`w-28 rounded-lg border px-2.5 py-1.5 text-sm outline-none transition ${isDirty ? "border-amber-400 bg-white" : "border-slate-200 bg-white"} focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10`}
                                value={draft}
                                onChange={(event) => setDraft(test.testCode, event.target.value)}
                                placeholder={test.suggestedPrice ? "Suggested" : "Set price"}
                                inputMode="decimal"
                              />
                              {isDirty && (
                                <button type="button" onClick={() => resetDraft(test.testCode)} className="text-slate-400 transition hover:text-red-600" aria-label={`Revert ${test.testName} price`}>
                                  <RotateCcw size={14} />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400">Leave empty to use the suggested price.</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${test.priceSource === "LAB" ? "bg-teal-50 text-teal-800" : test.priceSource === "SUGGESTED" ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"}`}>
                              {formatInr(test.effectivePrice)}
                              {test.priceSource === "LAB" && <Check size={11} />}
                            </span>
                            {test.priceSource === "UNSET" && <p className="mt-1 text-[10px] text-red-500">Not billable until priced</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>
                  {filtered.length} test{filtered.length === 1 ? "" : "s"} · Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft size={14} /> Prev
                  </Button>
                  <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Suggested prices are system-defined defaults for new laboratories — they are not market prices. Adjust them to match
            your laboratory&apos;s own rate card.
          </p>
        </div>
      </main>

      {defaultsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Set Default Prices</h2>
              <button type="button" onClick={() => setDefaultsOpen(false)} className="text-slate-400 transition hover:text-slate-600" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Apply the system-defined suggested prices to your catalog. These are starting defaults, not market prices.
            </p>

            <div className="mt-4 space-y-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${!defaultsOverwrite ? "border-teal-600 bg-teal-50/60" : "border-slate-200 hover:border-teal-400"}`}>
                <input type="radio" className="mt-1" checked={!defaultsOverwrite} onChange={() => setDefaultsOverwrite(false)} />
                <span>
                  <span className="block font-semibold text-slate-900">Fill missing prices only</span>
                  <span className="text-xs text-slate-500">
                    Applies suggested prices to {defaultsPreview.unsetCount} test{defaultsPreview.unsetCount === 1 ? "" : "s"} that have no lab price. Your existing prices are kept.
                  </span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${defaultsOverwrite ? "border-teal-600 bg-teal-50/60" : "border-slate-200 hover:border-teal-400"}`}>
                <input type="radio" className="mt-1" checked={defaultsOverwrite} onChange={() => setDefaultsOverwrite(true)} />
                <span>
                  <span className="block font-semibold text-slate-900">Overwrite all registry prices</span>
                  <span className="text-xs text-slate-500">
                    Replaces the prices of all {defaultsPreview.unsetCount + defaultsPreview.configuredCount} registry tests with the suggested prices. Custom test prices are never touched.
                  </span>
                </span>
              </label>
            </div>

            {defaultsOverwrite && defaultsPreview.configuredCount > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This will overwrite {defaultsPreview.configuredCount} lab-specific price{defaultsPreview.configuredCount === 1 ? "" : "s"}. Existing invoices keep their snapshotted prices.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDefaultsOpen(false)}>Cancel</Button>
              <Button onClick={applyDefaultPrices} disabled={defaultsWorking}>
                <Sparkles size={16} /> {defaultsWorking ? "Applying..." : defaultsOverwrite ? "Overwrite prices" : "Apply defaults"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
