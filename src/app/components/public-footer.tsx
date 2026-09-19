import Link from "next/link";
import { BadgeCheck, Briefcase, Code2, FlaskConical, Globe, Send, ShieldCheck } from "lucide-react";

const DEVELOPER_LINKS = [
  { href: "https://www.priyanshu.engineer/", label: "PRYAVO | Project Index", icon: Globe },
  { href: "https://github.com/Priyanshu84iya", label: "GitHub", icon: Code2 },
  { href: "https://www.linkedin.com/in/priyanshu-chaurasiya-8986a833b/", label: "LinkedIn", icon: Briefcase },
  { href: "https://g.dev/priyanshu26", label: "Google Developer Profile", icon: BadgeCheck },
  { href: "https://www.buymeacoffee.com/priyanshu6o", label: "Support the Developer", icon: Send },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8faf9]">
      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-base font-bold tracking-tight text-slate-950">
              Northstar Diagnostics
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Laboratory Information Management System — from patient registration to signed,
              printable pathology reports.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Footer navigation">
            <Link href="/" className="w-fit text-slate-600 transition hover:text-teal-700">
              Home
            </Link>
            <Link href="/about" className="w-fit text-slate-600 transition hover:text-teal-700">
              About
            </Link>
            <Link href="/contact" className="w-fit text-slate-600 transition hover:text-teal-700">
              Contact
            </Link>
            <Link href="/download-report" className="w-fit text-slate-600 transition hover:text-teal-700">
              Download Report
            </Link>
            <Link
              href="/login"
              className="flex w-fit items-center gap-1.5 text-slate-600 transition hover:text-teal-700"
            >
              <ShieldCheck size={14} /> Admin Login
            </Link>
            <Link
              href="/login"
              className="flex w-fit items-center gap-1.5 text-slate-600 transition hover:text-teal-700"
            >
              <FlaskConical size={14} /> Lab Login
            </Link>
          </nav>

          <div>
            <p className="text-sm font-semibold text-slate-950">Developed by Priyanshu Chaurasiya</p>
            <ul className="mt-3 flex flex-col gap-2">
              {DEVELOPER_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-2 text-sm text-slate-600 transition hover:text-teal-700"
                  >
                    <link.icon size={14} className="shrink-0 text-teal-700" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Northstar Diagnostics — Laboratory Information Management
            System. Developed by Priyanshu Chaurasiya.
          </p>
        </div>
      </div>
    </footer>
  );
}
