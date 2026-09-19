"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, FileText, Loader2, Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "../../components/public-header";
import { PublicFooter } from "../../components/public-footer";

type PublicReport = {
  reportNumber: string;
  status: string;
  reportDate: string | null;
  patientCode: string;
  token: string;
};

export default function DownloadReportPage() {
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<PublicReport[] | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (verifying) return;
    setError("");
    setDownloadError("");
    setVerifying(true);
    try {
      const response = await fetch("/api/public/verify-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, dateOfBirth }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to verify your details. Please try again.");
      }
      setReports(data.reports || []);
    } catch (verifyError) {
      setReports(null);
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify your details. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  }

  async function download(report: PublicReport) {
    if (downloading) return;
    setDownloadError("");
    setDownloading(report.reportNumber);
    try {
      const response = await fetch("/api/public/download-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: report.token }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Your download link is invalid or has expired. Please verify your details again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report.reportNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadFail) {
      setDownloadError(
        downloadFail instanceof Error ? downloadFail.message : "Failed to download the report."
      );
    } finally {
      setDownloading(null);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader />

      <main className="pt-16">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-xl px-5 lg:px-8">
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <FileText size={22} />
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Download Your Report
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Enter your registered mobile number and date of birth to securely access your
                pathology reports. No account required.
              </p>
            </div>

            {reports === null ? (
              <form
                onSubmit={verify}
                className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-teal-900/5 sm:p-8"
              >
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="phone">Registered mobile number</Label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        required
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className={`${fieldClass} !pl-10`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dob">Date of birth</Label>
                    <div className="relative">
                      <CalendarDays size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <Input
                        id="dob"
                        type="date"
                        required
                        value={dateOfBirth}
                        onChange={(event) => setDateOfBirth(event.target.value)}
                        className={`${fieldClass} !pl-10`}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="mt-6 w-full" disabled={verifying}>
                  {verifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <Lock size={16} /> Verify & View Reports
                    </>
                  )}
                </Button>
                <p className="mt-4 text-center text-xs text-slate-400">
                  Your details are verified securely and are never shared or stored in your browser.
                </p>
              </form>
            ) : (
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-teal-900/5 sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-950">Your reports</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReports(null);
                      setPhone("");
                      setDateOfBirth("");
                    }}
                  >
                    Verify different details
                  </Button>
                </div>

                {reports.length === 0 ? (
                  <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No completed reports are available yet. Reports appear here once your laboratory
                    finalizes them. If you believe this is a mistake, please reach us via the{" "}
                    <Link href="/contact" className="font-medium text-teal-700 underline underline-offset-2">
                      Contact page
                    </Link>
                    .
                  </p>
                ) : (
                  <ul className="mt-6 space-y-3">
                    {reports.map((report) => (
                      <li
                        key={report.reportNumber}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Report {report.reportNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Patient ID: {report.patientCode}
                            {report.reportDate &&
                              ` · ${new Date(report.reportDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => download(report)}
                          disabled={downloading !== null}
                          className="sm:shrink-0"
                        >
                          {downloading === report.reportNumber ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Preparing…
                            </>
                          ) : (
                            <>
                              <Download size={14} /> Download PDF
                            </>
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {downloadError && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600" role="alert">
                    {downloadError}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
