"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ClipboardPlus, Plus, Search, ShieldCheck, X } from "lucide-react";
import { LABORATORY_TESTS } from "@/lib/laboratory/registry";
import type { Gender, LaboratoryTest, TestParameter } from "@/lib/laboratory/types";
import { getReferenceRange, getResultStatus } from "@/lib/laboratory/result-status";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : "";
}

const fieldClass = "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
const errorFieldClass = "mt-2 w-full rounded-lg border border-red-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

function sanitizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
const customParameter = (index: number): TestParameter => ({
  code: `CUSTOM_PARAM_${index + 1}`,
  name: "",
  unit: "",
  inputType: "TEXT",
  referenceRanges: [{ display: "" }],
  sortOrder: index,
});

type PatientRecord = {
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
};

export default function ReportWorkspace() {
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRecord[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTests, setCustomTests] = useState<LaboratoryTest[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [catalogSearch, setCatalogSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [customOpen, setCustomOpen] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Custom");
  const [customParameters, setCustomParameters] = useState<TestParameter[]>([customParameter(0)]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  useEffect(() => {
    const query = patientSearch.trim();
    if (!query || selectedPatient) {
      setPatientResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setSearchingPatients(true);
      fetch(`/api/patients?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => { if (data.success) setPatientResults(data.patients); })
        .catch(() => undefined)
        .finally(() => setSearchingPatients(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [patientSearch, selectedPatient]);

  function selectPatient(patient: PatientRecord) {
    setSelectedPatient(patient);
    setFullName(patient.fullName);
    setDateOfBirth(patient.dateOfBirth.slice(0, 10));
    setGender(patient.gender as Gender);
    setPhoneCountryCode(patient.phoneCountryCode || "+91");
    setPhone(patient.phone || "");
    setEmail(patient.email || "");
    setAddress(patient.address || "");
    setReferredBy(patient.referredBy || "");
    setPatientSearch("");
    setPatientResults([]);
  }

  function clearPatient() {
    setSelectedPatient(null);
    setFullName("");
    setDateOfBirth("");
    setGender("");
    setPhoneCountryCode("+91");
    setPhone("");
    setEmail("");
    setAddress("");
    setReferredBy("");
  }

  useEffect(() => {
    fetch("/api/custom-tests")
      .then((response) => response.json())
      .then((data) => {
        const savedTests = (data.tests || []).flatMap((savedTest: { code: string; definition: string }) => {
          try {
            const definition = JSON.parse(savedTest.definition) as Omit<LaboratoryTest, "code" | "sortOrder">;
            return [{ ...definition, code: savedTest.code, sortOrder: 1000 }];
          } catch {
            return [];
          }
        });
        setCustomTests(savedTests);
      })
      .catch(() => undefined);
  }, []);

  const allTests = useMemo(() => [...LABORATORY_TESTS, ...customTests], [customTests]);
  const allCategories = useMemo(() => Array.from(new Set(allTests.map((test) => test.category))), [allTests]);

  const filteredTests = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return allTests.filter((test) => {
      if (categoryFilter !== "ALL" && test.category !== categoryFilter) return false;
      if (!query) return true;
      return `${test.name} ${test.code} ${test.category}`.toLowerCase().includes(query);
    });
  }, [allTests, catalogSearch, categoryFilter]);

  const groupedTests = useMemo(() => {
    const groups = new Map<string, LaboratoryTest[]>();
    for (const test of filteredTests) {
      const list = groups.get(test.category) || [];
      list.push(test);
      groups.set(test.category, list);
    }
    return Array.from(groups.entries());
  }, [filteredTests]);

  const selectedTestObjects = useMemo(
    () => selectedTests.map((code) => allTests.find((test) => test.code === code)).filter((test): test is LaboratoryTest => Boolean(test)),
    [selectedTests, allTests],
  );

  function toggleTest(code: string) {
    setSelectedTests((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  function updateResult(code: string, value: string) {
    setResults((current) => ({ ...current, [code]: value }));
  }

  function updateCustomParameter(index: number, field: "name" | "unit" | "reference", value: string) {
    setCustomParameters((current) => current.map((parameter, parameterIndex) => parameterIndex === index ? {
      ...parameter,
      ...(field === "reference" ? { referenceRanges: [{ display: value }] } : { [field]: value }),
      ...(field === "name" ? { code: `CUSTOM_${value.toUpperCase().replace(/[^A-Z0-9]+/g, "_") || index + 1}` } : {}),
    } : parameter));
  }

  async function saveCustomTest() {
    setError("");
    if (!customCode.trim() || !customName.trim() || customParameters.some((parameter) => !parameter.name.trim())) {
      setError("Add a code, test name, and a name for every custom parameter.");
      return;
    }
    const test: LaboratoryTest = {
      code: customCode.trim().toUpperCase(),
      name: customName.trim(),
      category: customCategory.trim() || "Custom",
      parameters: customParameters,
      sortOrder: 1000 + customTests.length,
    };
    try {
      const response = await fetch("/api/custom-tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(test) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save custom test.");
      setCustomTests((current) => [...current, test]);
      setSelectedTests((current) => [...current, test.code]);
      setCustomOpen(false);
      setCustomCode("");
      setCustomName("");
      setCustomParameters([customParameter(0)]);
      setMessage("Custom test added to the catalog.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save custom test.");
    }
  }

  async function saveReport() {
    setMessage("");
    setError("");
    const nextPhoneError = selectedPatient ? "" : !phone ? "Phone number is required." : phone.length !== 10 ? "Phone number must be exactly 10 digits." : "";
    const nextEmailError = selectedPatient ? "" : !email.trim() ? "Email is required." : !EMAIL_PATTERN.test(email.trim()) ? "Enter a valid email address." : "";
    setPhoneError(nextPhoneError);
    setEmailError(nextEmailError);
    if ((!selectedPatient && (!fullName.trim() || !dateOfBirth || !gender)) || selectedTests.length === 0) {
      setError("Select a patient (or enter patient details) and choose at least one test.");
      return;
    }
    if (nextPhoneError || nextEmailError) return;
    try {
      setIsSaving(true);
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient?.id, fullName, dateOfBirth, gender, phoneCountryCode, phone, email, address, referredBy, selectedTests, results, customTests }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to save report.");
      setMessage(`Report ${data.reportNumber} saved successfully.`);
      setSelectedTests([]);
      setResults({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong while saving the report.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] text-slate-900">
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Clinical workspace / accessioning</p><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create pathology report</h1><p className="mt-2 text-sm text-slate-500">Capture patient details, select investigations, and record verified results.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-teal-700" /> Results are status-checked against the laboratory registry</div></div>
        {message && <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</div>}
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"><div className="mb-6 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">01</span><div><h2 className="font-semibold">Patient details</h2><p className="text-sm text-slate-500">Search for a registered patient or enter details manually.</p></div></div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
            placeholder="Search patient by ID (P001), name, phone, or email..."
          />
          {searchingPatients && <p className="mt-1 text-xs text-slate-400">Searching...</p>}
          {patientResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {patientResults.map((patient) => (
                <button key={patient.id} type="button" onClick={() => selectPatient(patient)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-teal-50">
                  <span>
                    <span className="block font-semibold text-slate-900">{patient.fullName}</span>
                    <span className="block text-xs text-slate-500">{patient.phoneCountryCode} {patient.phone} · {patient.email}</span>
                  </span>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">{patient.patientCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
            <div className="text-sm">
              <span className="font-bold text-teal-900">{selectedPatient.patientCode}</span>
              <span className="mx-2 text-teal-400">·</span>
              <span className="font-semibold text-teal-900">{selectedPatient.fullName}</span>
              <span className="mx-2 text-teal-400">·</span>
              <span className="text-teal-800">{calculateAge(selectedPatient.dateOfBirth)} yrs / {selectedPatient.gender}</span>
              <span className="mx-2 text-teal-400">·</span>
              <span className="text-teal-800">{selectedPatient.phoneCountryCode} {selectedPatient.phone}</span>
            </div>
            <button type="button" onClick={clearPatient} className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-100" aria-label="Clear selected patient"><X size={16} /></button>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">Full name *<input className={selectedPatient ? `${fieldClass} bg-slate-50` : fieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} readOnly={Boolean(selectedPatient)} placeholder="e.g. Amara Okafor" /></label>
          <label className="text-sm font-medium">Date of birth *<input className={selectedPatient ? `${fieldClass} bg-slate-50` : fieldClass} type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} readOnly={Boolean(selectedPatient)} /></label>
          <label className="text-sm font-medium">Age<input className={`${fieldClass} bg-slate-50`} value={age} readOnly placeholder="Calculated" /></label>
          <label className="text-sm font-medium">Gender *<select className={selectedPatient ? `${fieldClass} bg-slate-50` : fieldClass} value={gender} onChange={(event) => setGender(event.target.value as Gender)} disabled={Boolean(selectedPatient)}><option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label>
          <label className="text-sm font-medium">Phone *<div className="mt-2 flex gap-2"><CountryCodeSelect value={phoneCountryCode} onChange={setPhoneCountryCode} /><input className={phoneError ? errorFieldClass : "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"} value={phone} onChange={(event) => { setPhone(sanitizePhone(event.target.value)); if (phoneError) setPhoneError(""); }} onPaste={(event) => { event.preventDefault(); setPhone((current) => sanitizePhone(current + event.clipboardData.getData("text"))); }} inputMode="numeric" maxLength={10} placeholder="10-digit number" /></div>{phoneError && <p className="mt-1.5 text-xs font-medium text-red-600">{phoneError}</p>}</label>
          <label className="text-sm font-medium">Email *<input className={emailError ? errorFieldClass : fieldClass} type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError(""); }} placeholder="patient@email.com" />{emailError && <p className="mt-1.5 text-xs font-medium text-red-600">{emailError}</p>}</label>
          <label className="text-sm font-medium">Referring clinician<input className={fieldClass} value={referredBy} onChange={(event) => setReferredBy(event.target.value)} placeholder="Dr. A. Mensah" /></label>
          <label className="text-sm font-medium">Address<input className={fieldClass} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Patient address" /></label>
        </div></section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">02</span><div><h2 className="font-semibold">Investigation catalog</h2><p className="text-sm text-slate-500">{selectedTests.length} selected from {allTests.length} available investigations.</p></div></div>
            <Button type="button" onClick={() => setCustomOpen(true)}><Plus size={16} /> Custom test</Button>
          </div>

          <Command shouldFilter={false} className="mt-6 rounded-xl border border-slate-200">
            <CommandInput value={catalogSearch} onValueChange={setCatalogSearch} placeholder="Search by test name, code, or category..." />
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2.5">
              <button type="button" onClick={() => setCategoryFilter("ALL")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${categoryFilter === "ALL" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All categories</button>
              {allCategories.map((category) => (
                <button key={category} type="button" onClick={() => setCategoryFilter(categoryFilter === category ? "ALL" : category)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${categoryFilter === category ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{category}</button>
              ))}
            </div>
            <CommandList>
              <CommandEmpty>No investigations match this search.</CommandEmpty>
              {groupedTests.map(([category, tests]) => (
                <CommandGroup key={category} heading={category}>
                  {tests.map((test) => {
                    const selected = selectedTests.includes(test.code);
                    return (
                      <CommandItem key={test.code} value={test.code} onSelect={() => toggleTest(test.code)} className="py-2.5">
                        <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${selected ? "border-teal-600 bg-teal-700 text-white" : "border-slate-300 text-transparent"}`}><Check size={13} /></span>
                        <span className="flex-1">
                          <span className="block font-medium text-slate-900">{test.name}</span>
                          <span className="block text-xs text-slate-500">{test.code} · {test.parameters.length} parameter{test.parameters.length !== 1 ? "s" : ""}</span>
                        </span>
                        <Badge variant={selected ? "default" : "outline"}>{selected ? "Selected" : test.category}</Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>

          {selectedTestObjects.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected:</span>
              {selectedTestObjects.map((test) => (
                <span key={test.code} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                  {test.name}
                  <button type="button" onClick={() => toggleTest(test.code)} className="flex size-4 items-center justify-center rounded-full text-teal-600 hover:bg-teal-200" aria-label={`Remove ${test.name}`}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </section>

        {selectedTests.length > 0 && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"><div className="mb-6 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">03</span><div><h2 className="font-semibold">Result entry</h2><p className="text-sm text-slate-500">Record each result. Status is calculated from the registry where a numeric range exists.</p></div></div>{selectedTestObjects.map((test) => <div key={test.code} className="mb-8 last:mb-0"><div className="mb-3 flex items-baseline justify-between border-b border-slate-100 pb-3"><div><h3 className="font-semibold text-teal-800">{test.name}</h3><p className="text-xs text-slate-500">{test.category} · {test.code}</p></div></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Parameter</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Reference</th></tr></thead><tbody>{test.parameters.map((parameter) => { const range = getReferenceRange(parameter, { gender: gender || undefined, age: typeof age === "number" ? age : undefined }); const result = results[parameter.code] || ""; const status = getResultStatus(result, parameter, { gender: gender || undefined, age: typeof age === "number" ? age : undefined }); const statusClass = status === "NORMAL" ? "bg-emerald-50 text-emerald-700" : status === "HIGH" ? "bg-red-50 text-red-700" : status === "LOW" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"; return <tr key={parameter.code} className="border-t border-slate-100"><td className="px-4 py-4 font-medium">{parameter.name || "Unnamed parameter"}{parameter.required && <span className="text-red-500"> *</span>}</td><td className="px-4 py-4"><input className="w-36 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500" type={parameter.inputType === "NUMBER" ? "number" : "text"} value={result} onChange={(event) => updateResult(parameter.code, event.target.value)} placeholder="Enter result" /></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{status}</span></td><td className="px-4 py-4 text-slate-500">{parameter.unit || "-"}</td><td className="px-4 py-4 text-slate-500">{range?.display || (range ? `${range.min ?? "-"} - ${range.max ?? "-"}` : "-")}</td></tr> })}</tbody></table></div></div>)}</section>}

        <section className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-900 p-6 text-white shadow-sm md:flex-row md:items-center lg:p-8"><div><h2 className="font-semibold">Ready to save this report?</h2><p className="mt-1 text-sm text-teal-100">The report will be stored with patient, test, result, reference, and status snapshots.</p></div><button type="button" disabled={isSaving} onClick={saveReport} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-teal-900 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving report..." : "Save pathology report"}<ArrowRight size={16} /></button></section>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create custom test</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">Add a reusable test and its parameters to the catalog.</p>
          </DialogHeader>
          <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Code<input className={fieldClass} value={customCode} onChange={(event) => setCustomCode(event.target.value)} placeholder="e.g. PTX" /></label><label className="text-sm font-medium sm:col-span-2">Test name<input className={fieldClass} value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Pathology test name" /></label><label className="text-sm font-medium sm:col-span-3">Category<input className={fieldClass} value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} /></label></div>
          <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Parameters</h3><button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700" onClick={() => setCustomParameters((current) => [...current, customParameter(current.length)])}><Plus size={15} /> Add parameter</button></div><div className="max-h-64 space-y-3 overflow-y-auto">{customParameters.map((parameter, index) => <div key={index} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"><input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={parameter.name} onChange={(event) => updateCustomParameter(index, "name", event.target.value)} placeholder="Parameter name" /><input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={parameter.unit} onChange={(event) => updateCustomParameter(index, "unit", event.target.value)} placeholder="Unit" /><input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={parameter.referenceRanges[0]?.display || ""} onChange={(event) => updateCustomParameter(index, "reference", event.target.value)} placeholder="Reference range / note" /></div>)}</div></div>
          <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setCustomOpen(false)}>Cancel</Button><Button type="button" onClick={saveCustomTest}><ClipboardPlus size={16} /> Save custom test</Button></div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
