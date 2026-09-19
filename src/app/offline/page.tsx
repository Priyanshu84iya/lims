import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline | Northstar Diagnostics",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <CloudOff size={30} />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
        You&apos;re offline
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
        Northstar Diagnostics needs an internet connection to load laboratory data, reports, and
        patient information. Your data is never stored on this device.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800"
        >
          <RefreshCw size={15} /> Try Again
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}
