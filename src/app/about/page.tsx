import {
  BadgeCheck,
  Briefcase,
  Building2,
  Code2,
  FileText,
  FlaskConical,
  Globe,
  Lock,
  MessageSquare,
  Printer,
  QrCode,
  ScanBarcode,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { PublicHeader } from "../components/public-header";
import { PublicFooter } from "../components/public-footer";
import { AshnaAIWidget } from "../components/ashna-ai-widget";

const CAPABILITIES = [
  {
    icon: Building2,
    title: "Multi-laboratory management",
    description:
      "Administrators register laboratories with unique credentials, while every lab works in a fully isolated workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Admin & Lab authentication",
    description:
      "Separate Admin and Lab sign-in with hashed credentials, server-side sessions, and protected routes.",
  },
  {
    icon: UserPlus,
    title: "Patient registration",
    description:
      "Reception workflow with automatic Patient ID generation and a printable registration slip.",
  },
  {
    icon: ScanBarcode,
    title: "Barcode & QR",
    description:
      "Barcodes and QR codes on reports and slips for fast, reliable sample and patient identification.",
  },
  {
    icon: FlaskConical,
    title: "Test management",
    description:
      "A built-in pathology test catalog plus lab-defined custom tests and parameters.",
  },
  {
    icon: FileText,
    title: "Laboratory results & reference ranges",
    description:
      "Structured result entry for each test parameter, with reference ranges for interpretation.",
  },
  {
    icon: Printer,
    title: "Pathology report generation",
    description:
      "Professional PDF and print-ready reports with the lab's own logo and authorized signature.",
  },
  {
    icon: QrCode,
    title: "Report identification",
    description:
      "Every report carries a barcode and QR code so patients and staff can verify and retrieve it instantly.",
  },
  {
    icon: Sparkles,
    title: "AI-Assisted Health Information",
    description:
      "AI-generated health information appended to completed reports for patient education.",
  },
  {
    icon: Lock,
    title: "Lab-specific data isolation",
    description:
      "Patients, reports, and custom tests are scoped to each laboratory and enforced server-side.",
  },
  {
    icon: MessageSquare,
    title: "Contact message management",
    description:
      "Messages from the public contact form land in the administrator's inbox with read/unread state.",
  },
];

const DEVELOPER_LINKS = [
  { href: "https://www.priyanshu.engineer/", label: "PRYAVO | Project Index", icon: Globe },
  { href: "https://github.com/Priyanshu84iya", label: "GitHub", icon: Code2 },
  { href: "https://www.linkedin.com/in/priyanshu-chaurasiya-8986a833b/", label: "LinkedIn", icon: Briefcase },
  { href: "https://g.dev/priyanshu26", label: "Google Developer Profile", icon: BadgeCheck },
  { href: "https://www.buymeacoffee.com/priyanshu6o", label: "Support the Developer", icon: Send },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader />

      <main className="pt-16">
        <section className="border-b border-slate-100 bg-[#f8faf9] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
              About
            </p>
            <h1 className="animate-fade-up mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              About the LIMS
            </h1>
            <p className="animate-fade-up mt-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Northstar Diagnostics is a full-featured Laboratory Information Management System
              built to digitize the day-to-day workflow of clinical pathology laboratories. It was
              created to replace manual, paper-based processes with a single, secure platform — so
              laboratories can register patients, manage investigations, record results, and issue
              professional reports without fragmented tooling.
            </p>
            <p className="animate-fade-up mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
              The problem it solves is simple: most small and mid-sized laboratories juggle paper
              registers, spreadsheets, and word processors to produce reports. That is slow, error
              prone, and impossible to audit. Northstar Diagnostics brings the entire workflow —
              from patient registration to the signed, printable report — into one system with
              automatic Patient IDs, structured result entry, and built-in verification through
              barcodes and QR codes.
            </p>
            <p className="animate-fade-up mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Laboratories use it through a dedicated workspace: reception staff register patients
              and generate registration slips, technicians record results against the test catalog,
              and the lab issues final PDF reports carrying its own logo and authorized signature.
              A platform administrator onboards laboratories and manages the whole deployment.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              What the platform includes
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
              Every capability below is implemented in the current system — nothing on this page
              is planned or aspirational.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((capability) => (
                <article
                  key={capability.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal-300 hover:shadow-md"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <capability.icon size={19} />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-950">{capability.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {capability.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-[#f8faf9] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                    Developed By
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                    Priyanshu Chaurasiya
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Developer & Creator of Northstar Diagnostics.
                  </p>
                </div>
                <ul className="grid gap-2.5 sm:grid-cols-2 lg:w-[26rem]">
                  {DEVELOPER_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:bg-teal-50/50 hover:text-teal-800"
                      >
                        <link.icon size={17} className="shrink-0 text-teal-700" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
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
