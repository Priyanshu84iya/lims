"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="text-base font-bold tracking-tight text-slate-950">
          Northstar Diagnostics
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 hover:text-slate-950 ${
                  active ? "text-teal-700" : "text-slate-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
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
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Public navigation mobile">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-100 ${
                    active ? "text-teal-700" : "text-slate-700"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <ShieldCheck size={15} /> Admin Login
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login" onClick={() => setMenuOpen(false)}>
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
