"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, History, Printer, Sparkles } from "lucide-react";
import AppShell from "@/app/components/app-shell";
import { ReportDocument } from "./report-template";
import {
  AI_DISCLAIMER,
  DEFAULT_LAB,
  formatDate,
  type LabInfo,
  type ReportRecord,
} from "./report-data";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Pathology report">
      <main className="px-5 py-7 text-slate-900 lg:px-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </AppShell>
  );
}

function HistoryView({ history, patientId, error }: { history: ReportRecord[]; patientId: string; error: string }) {
  return (
    <Shell>
      <Link href="/reports" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-700">
        <ArrowLeft size={16} /> Reports list
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Patient record</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Report history</h1>
          <p className="mt-2 text-sm text-slate-500">All previous reports for patient #{patientId}.</p>
        </div>
        <History className="text-teal-700" />
      </div>
      {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="mt-8 space-y-3">
        {history.map((item) => (
          <Link key={item.id} href={`/reports/${item.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300">
            <div>
              <p className="font-semibold text-teal-800">{item.reportNumber}</p>
              <p className="mt-1 text-sm text-slate-500">{item.patient?.fullName} · {formatDate(item.reportDate)}</p>
            </div>
            <FileText size={18} className="text-slate-400" />
          </Link>
        ))}
      </div>
    </Shell>
  );
}

export default function ReportView({ reportId, patientId }: { reportId?: string; patientId?: string }) {
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [lab, setLab] = useState<LabInfo>(DEFAULT_LAB);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    const query = reportId ? `?id=${reportId}` : `?patientId=${patientId}`;
    fetch(`/api/reports${query}`)
      .then((response) => response.json())
      .then((data) => {
        if (reportId) setReport(data.report);
        else setHistory(data.reports || []);
        if (!data.success) setError(data.error);
      })
      .catch(() => setError("Unable to load report data."));
  }, [reportId, patientId]);

  // Auto-generate the AI health information when a report loads.
  useEffect(() => {
    if (!report || analysis || analysisLoading || analysisError) return;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  useEffect(() => {
    fetch("/api/lab", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.success) setLab(data.lab);
      })
      .catch(() => {});
  }, []);

  async function runAnalysis() {
    if (!report) return;
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Analysis failed.");
      setAnalysis(data.analysis);
    } catch (analysisErr) {
      setAnalysisError(analysisErr instanceof Error ? analysisErr.message : "Unable to generate analysis.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function downloadPdf() {
    if (!report) return;
    setPdfLoading(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.reportNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (pdfError) {
      setPdfError(pdfError instanceof Error ? pdfError.message : "Failed to generate PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (!reportId) return <HistoryView history={history} patientId={patientId || ""} error={error} />;
  if (error) return <Shell><p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p></Shell>;
  if (!report) return <Shell><p className="text-slate-500">Loading report...</p></Shell>;

  return (
    <Shell>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-start print-hide">
        <div>
          <Link href="/reports" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-700">
            <ArrowLeft size={16} /> Reports list
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Pathology report</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{report.reportNumber}</h1>
          <p className="mt-2 text-sm text-slate-500">Issued {formatDate(report.reportDate)} · {report.status}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Download size={16} /> {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      <section className="mb-7 rounded-2xl border border-violet-200 bg-violet-50/60 p-6 print-hide">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-violet-900"><Sparkles size={17} /> AI Health Analysis</h2>
            <p className="mt-1 text-xs text-violet-700">{AI_DISCLAIMER}</p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analysisLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60"
          >
            {analysisLoading ? "Analyzing results..." : analysis ? "Regenerate analysis" : "Generate analysis"}
          </button>
        </div>
        {analysisError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{analysisError}</p>}
        {analysis && <p className="mt-4 text-xs text-violet-700">Generated — included below in the report and in the downloaded PDF.</p>}
        {pdfError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pdfError}</p>}
      </section>

      <article className="print-report">
        <ReportDocument report={report} lab={lab} analysis={analysis || undefined} />
      </article>
    </Shell>
  );
}
