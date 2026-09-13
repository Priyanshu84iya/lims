"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
} from "lucide-react";
import AppShell from "@/app/components/app-shell";
import { useRouter } from "next/navigation";

type Report = {
  id: number;
  reportNumber: string;
  status: string;
  reportDate: string | null;
  createdAt: string;
  patient?: {
    id: number;
    fullName: string;
    patientCode: string;
    phone: string | null;
  } | null;
  tests?: { testName: string }[];
};

const pageSize = 10;

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
    : "Not dated";
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reports")
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error);
        setReports(data.reports || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load reports."))
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = useMemo(() => reports
    .filter((report) => {
      const haystack = `${report.reportNumber} ${report.patient?.fullName || ""} ${report.patient?.patientCode || ""} ${report.patient?.phone || ""}`.toLowerCase();
      return (!search || haystack.includes(search.toLowerCase()))
        && (status === "ALL" || report.status === status)
        && (!dateFilter || report.reportDate?.startsWith(dateFilter));
    })
    .sort((left, right) => {
      const first = new Date(left.reportDate || left.createdAt).getTime();
      const second = new Date(right.reportDate || right.createdAt).getTime();
      return sortNewest ? second - first : first - second;
    }), [dateFilter, reports, search, sortNewest, status]);

  const pageCount = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const visibleReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const router = useRouter();

  async function downloadReport(report: Report) {
    router.push(`/reports/${report.id}`);
  }

  return (
    <AppShell title="Reports">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-slate-500">Clinical workspace</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Reports</h2>
              <p className="mt-2 text-sm text-slate-500">Search, review, print, and download pathology reports.</p>
            </div>
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> New report</Link>
          </div>

          <section className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_160px_170px_160px]">
            <label className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500" value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} placeholder="Report, patient, code, phone" /></label>
            <select className="rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="COMPLETED">Completed</option><option value="FINALIZED">Finalized</option></select>
            <label className="relative"><CalendarDays size={16} className="absolute left-3 top-3 text-slate-400" /><input type="date" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500" value={dateFilter} onChange={(event) => updateFilter(setDateFilter, event.target.value)} /></label>
            <select className="rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" value={sortNewest ? "NEWEST" : "OLDEST"} onChange={(event) => setSortNewest(event.target.value === "NEWEST")}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option></select>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {error ? <p className="p-8 text-red-700">{error}</p> : loading ? <p className="p-12 text-center text-slate-500">Loading reports...</p> : filteredReports.length === 0 ? <p className="p-12 text-center text-slate-500">No reports found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Report number</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Tests</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Report date</th><th className="px-5 py-4">Created</th><th className="px-5 py-4" /></tr></thead><tbody>{visibleReports.map((report) => <tr key={report.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/reports/${report.id}`} className="font-semibold text-teal-800 hover:underline">{report.reportNumber}</Link></td><td className="px-5 py-4"><p className="font-medium">{report.patient?.fullName || "Unknown patient"}</p><p className="mt-1 text-xs text-slate-500">{report.patient?.patientCode || "-"}</p></td><td className="max-w-64 px-5 py-4 text-slate-500">{report.tests?.map((test) => test.testName).join(", ") || "-"}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{report.status}</span></td><td className="px-5 py-4 text-slate-500">{formatDate(report.reportDate)}</td><td className="px-5 py-4 text-slate-500">{formatDate(report.createdAt)}</td><td className="px-5 py-4"><div className="flex items-center justify-end gap-1"><Link href={`/reports/${report.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700" aria-label="View report"><ChevronRight size={17} /></Link><Link href={`/reports/${report.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Print report"><Printer size={16} /></Link><button type="button" onClick={() => downloadReport(report)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Download PDF"><Download size={16} /></button><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="More actions"><MoreHorizontal size={17} /></button></div></td></tr>)}</tbody></table></div>}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><span>{filteredReports.length} report{filteredReports.length === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
