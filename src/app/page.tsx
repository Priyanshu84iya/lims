"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Code2,
  FileText,
  FlaskConical,
  Globe,
  Lock,
  Menu,
  MessageSquare,
  Printer,
  QrCode,
  ScanBarcode,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const NAV_LINKS = [
  { href: "#landing", label: "Landing" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

const CAPABILITIES = [
  {
    icon: Building2,
    title: "Multi-lab management",
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
    title: "Test catalog & custom tests",
    description:
      "A built-in pathology test registry plus lab-defined custom tests and parameters.",
  },
  {
    icon: FileText,
    title: "Report generation",
    description:
      "Complete pathology result management with structured test and parameter entry.",
  },
  {
    icon: Printer,
    title: "PDF & printable reports",
    description:
      "Professional PDF and print-ready reports with the lab's own logo and authorized signature.",
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
];

const CREATOR_LINKS = [
  { href: "https://www.priyanshu.engineer/", label: "PRYAVO | Project Index", icon: Globe },
  { href: "https://github.com/Priyanshu84iya", label: "GitHub — Priyanshu84iya (Pry Uchiha)", icon: Code2 },
  { href: "https://www.linkedin.com/in/priyanshu-chaurasiya-8986a833b/", label: "LinkedIn — Priyanshu Chaurasiya", icon: Briefcase },
  { href: "https://g.dev/priyanshu26", label: "Google Developer Profile", icon: BadgeCheck },
  { href: "https://www.buymeacoffee.com/priyanshu6o", label: "Support", icon: Send },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />

      <main>
        <LandingSection />
        <AboutSection />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <a href="#landing" className="text-base font-bold tracking-tight text-slate-950">
          Northstar Diagnostics
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">
              <ShieldCheck size={15} /> Admin Login
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">
              <FlaskConical size={15} /> Lab Login
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Public navigation mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={onToggleMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">
                  <ShieldCheck size={15} /> Admin Login
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">
                  <FlaskConical size={15} /> Lab Login
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function LandingSection() {
  return (
    <section id="landing" className="relative overflow-hidden pt-16">
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
            {[
              { icon: UserPlus, label: "Patient registration" },
              { icon: FileText, label: "Pathology reports" },
              { icon: QrCode, label: "Barcode & QR" },
              { icon: Printer, label: "PDF output" },
              { icon: Sparkles, label: "AI health info" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <item.icon size={16} className="text-teal-700" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="scroll-mt-16 border-t border-slate-100 bg-[#f8faf9] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">About</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            About the Project
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Northstar Diagnostics is a full-featured Laboratory Information Management System
            built to digitize the day-to-day workflow of clinical pathology laboratories. It was
            created to replace manual, paper-based processes with a single, secure platform — so
            laboratories can register patients, manage investigations, record results, and issue
            professional reports without fragmented tooling.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The platform supports multiple laboratories under one deployment. Each lab receives
            its own credentials and a strictly isolated workspace, while a platform administrator
            manages lab onboarding from a dedicated console.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Built By</p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                Priyanshu Chaurasiya
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Developer & Creator of Northstar Diagnostics.
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:w-[26rem]">
              {CREATOR_LINKS.map((link) => (
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
  );
}

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [failure, setFailure] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.email.trim() || !EMAIL_PATTERN.test(form.email.trim()))
      next.email = "A valid email address is required.";
    if (!form.subject.trim()) next.subject = "Subject is required.";
    if (!form.message.trim()) next.message = "Message is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSuccess("");
    setFailure("");
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send your message. Please try again.");
      }
      setSuccess("Thank you. Your message has been received — we will get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
      setErrors({});
    } catch (submitError) {
      setFailure(
        submitError instanceof Error
          ? submitError.message
          : "Failed to send your message. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

  return (
    <section id="contact" className="scroll-mt-16 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Contact</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Get in touch
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Have a question about Northstar Diagnostics, or want to learn how the platform can
            support your laboratory? Send us a message and we will respond as soon as possible.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f8faf9] px-4 py-3.5 text-sm text-slate-600">
            <MessageSquare size={17} className="shrink-0 text-teal-700" />
            Messages go straight to the platform administrator&apos;s inbox.
          </div>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {success && (
            <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
              {success}
            </p>
          )}
          {failure && (
            <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {failure}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                className={fieldClass}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your name"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="contact-subject">Subject</Label>
            <Input
              id="contact-subject"
              className={fieldClass}
              value={form.subject}
              onChange={(event) => updateField("subject", event.target.value)}
              placeholder="What is this about?"
              aria-invalid={Boolean(errors.subject)}
            />
            {errors.subject && <p className="mt-1.5 text-xs text-red-600">{errors.subject}</p>}
          </div>

          <div className="mt-4">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              rows={5}
              className={fieldClass}
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder="Write your message…"
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message && <p className="mt-1.5 text-xs text-red-600">{errors.message}</p>}
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Sending…
              </>
            ) : (
              <>
                <Send size={16} /> Send message
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8faf9]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row lg:px-8">
        <p>© {new Date().getFullYear()} Northstar Diagnostics — Laboratory Information Management System.</p>
        <div className="flex items-center gap-4">
          <a href="#landing" className="transition hover:text-teal-700">Landing</a>
          <a href="#about" className="transition hover:text-teal-700">About</a>
          <a href="#contact" className="transition hover:text-teal-700">Contact</a>
          <Link href="/login" className="font-medium text-teal-700 transition hover:text-teal-800">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
