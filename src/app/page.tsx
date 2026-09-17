import Link from "next/link";
import { FileText, FlaskConical, Printer, QrCode, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "./components/public-header";
import { PublicFooter } from "./components/public-footer";
import { AshnaAIWidget } from "./components/ashna-ai-widget";

const HIGHLIGHTS = [
  { icon: UserPlus, label: "Patient registration" },
  { icon: FileText, label: "Pathology reports" },
  { icon: QrCode, label: "Barcode & QR" },
  { icon: Printer, label: "PDF output" },
  { icon: Sparkles, label: "AI health info" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden pt-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-teal-50/80 via-white to-white"
          />
          <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-24 pt-20 text-center sm:pt-28 lg:px-8">
            <p className="animate-fade-up rounded-full border border-teal-200/70 bg-teal-50/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
              Laboratory Information Management System
            </p>

            <h1 className="animate-fade-up mt-7 max-w-4xl text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Northstar Diagnostics
            </h1>

            <p className="animate-fade-up mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
              Modern clinical pathology workflow — from patient registration to signed, printable reports.
            </p>

            <p className="animate-fade-up mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              Northstar Diagnostics is a modern Laboratory Information Management System (LIMS) that
              helps laboratories register patients, manage test catalogs, record pathology results,
              and generate professional PDF reports — with secure multi-lab support and complete
              data isolation.
            </p>

            <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">
                  <ShieldCheck size={17} /> Admin Login
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">
                  <FlaskConical size={17} /> Lab Login
                </Link>
              </Button>
            </div>

            <div className="animate-fade-up mt-16 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-teal-900/5 sm:p-8">
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
                {HIGHLIGHTS.map((item) => (
                  <span key={item.label} className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <item.icon size={16} className="text-teal-700" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
      <AshnaAIWidget />
    </div>
  );
}

