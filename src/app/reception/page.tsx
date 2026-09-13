"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ChevronDown, Printer, UserPlus } from "lucide-react";
import AppShell from "@/app/components/app-shell";
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

export default function ReceptionPage() {
  const router = useRouter();
  const [lab, setLab] = useState<Lab | null>(null);
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
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  useEffect(() => {
    if (!registeredPatient) {
      setQrDataUrl("");
      return;
    }
    const payload = JSON.stringify({
      patientId: registeredPatient.patientCode,
      name: registeredPatient.fullName,
      gender: registeredPatient.gender,
      phone: registeredPatient.phone ? `${registeredPatient.phoneCountryCode}${registeredPatient.phone}` : null,
      registeredAt: registeredPatient.createdAt,
    });
    QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 256 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [registeredPatient]);

  useEffect(() => {
    fetch("/api/lab")
      .then((response) => response.json())
      .then((data) => { if (data.success) setLab(data.lab); })
      .catch(() => undefined);
  }, []);

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
      setRegisteredPatient(data.patient);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong while registering the patient.");
    } finally {
      setIsSaving(false);
    }
  }

  function printSlip() {
    window.print();
  }

  function resetForm() {
    setRegisteredPatient(null);
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

  if (registeredPatient) {
    const registrationDate = new Date(registeredPatient.createdAt);
    return (
      <AppShell title="Patient registration slip">
        <main className="px-5 py-7 lg:px-8">
          <div className="mx-auto max-w-[800px]">
            <div className="mb-6 flex items-center justify-between print:hidden">
              <Button variant="outline" onClick={resetForm}>Register another patient</Button>
              <Button onClick={printSlip}><Printer size={16} /> Print slip</Button>
            </div>

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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient ID</p>
                  <p className="text-3xl font-bold text-teal-700">{registeredPatient.patientCode}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient name</p>
                  <p className="mt-1 text-lg font-semibold">{registeredPatient.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Age / Gender</p>
                  <p className="mt-1 text-lg font-semibold">{calculateAge(registeredPatient.dateOfBirth)} years / {registeredPatient.gender}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="mt-1 text-lg font-semibold">{registeredPatient.phoneCountryCode} {registeredPatient.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 text-lg font-semibold">{registeredPatient.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Referred by</p>
                  <p className="mt-1 text-lg font-semibold">{registeredPatient.referredBy || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registration date</p>
                  <p className="mt-1 text-lg font-semibold">{registrationDate.toLocaleDateString()} {registrationDate.toLocaleTimeString()}</p>
                </div>
              </div>

              {registeredPatient.address && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</p>
                  <p className="mt-1 text-sm">{registeredPatient.address}</p>
                </div>
              )}

              <div className="mt-8 flex items-end justify-between border-t border-slate-200 pt-6">
                <div>
                  <p className="text-xs text-slate-500">Please bring this slip for all future visits.</p>
                  <p className="mt-1 text-xs text-slate-400">Generated on {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block rounded-lg border border-slate-300 p-2">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt={`QR code for patient ${registeredPatient.patientCode}`} className="h-16 w-16" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center bg-slate-100 text-[10px] font-mono text-slate-600">
                        {registeredPatient.patientCode}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Scan for patient record</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Reception / Patient registration">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Reception</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Patient registration</h1>
            <p className="mt-2 text-sm text-slate-500">Register a new patient and generate their unique Patient ID.</p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
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
