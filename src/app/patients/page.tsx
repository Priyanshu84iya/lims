"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import AppShell from "@/app/components/app-shell";

type Patient = { id: number; patientCode: string; fullName: string; dateOfBirth: string; gender: string; phoneCountryCode: string | null; phone: string | null; email: string | null; reportsCount: number; createdAt: string };

function age(dateOfBirth: string) { const date = new Date(dateOfBirth); const now = new Date(); let years = now.getFullYear() - date.getFullYear(); if (now < new Date(now.getFullYear(), date.getMonth(), date.getDate())) years--; return years; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)); }

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/patients").then((response) => response.json()).then((data) => { if (!data.success) throw new Error(data.error); setPatients(data.patients); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load patients.")).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => patients.filter((patient) => `${patient.fullName} ${patient.patientCode} ${patient.phone || ""} ${patient.email || ""}`.toLowerCase().includes(search.toLowerCase())), [patients, search]);
  return <AppShell title="Patients"><main className="px-5 py-7 lg:px-8"><div className="mx-auto max-w-[1400px]"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm text-slate-500">Patient directory</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Patients</h2></div><div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 md:w-80" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, code, phone" /></div></div><section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{error ? <p className="p-8 text-red-700">{error}</p> : loading ? <p className="p-12 text-center text-slate-500">Loading patients...</p> : filtered.length === 0 ? <div className="flex flex-col items-center gap-2 p-12 text-center"><Users className="text-slate-300" /><p className="font-medium">No patients found</p><p className="text-sm text-slate-500">Try a different search term.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Patient code</th><th className="px-5 py-4">Age / gender</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Reports</th><th className="px-5 py-4">Created</th></tr></thead><tbody>{filtered.map((patient) => <tr key={patient.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/patients/${patient.id}`} className="font-semibold text-teal-800 hover:underline">{patient.fullName}</Link></td><td className="px-5 py-4 text-slate-500">{patient.patientCode}</td><td className="px-5 py-4">{age(patient.dateOfBirth)} years · {patient.gender}</td><td className="px-5 py-4 text-slate-500">{patient.phone ? `${patient.phoneCountryCode || "+91"} ${patient.phone}` : patient.email || "-"}</td><td className="px-5 py-4"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{patient.reportsCount}</span></td><td className="px-5 py-4 text-slate-500">{formatDate(patient.createdAt)}</td></tr>)}</tbody></table></div>}</section></div></main></AppShell>;
}
