"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reception", label: "Reception", icon: UserPlus },
  { href: "/reports/new", label: "Create report", icon: FileText },
  { href: "/reports", label: "Reports", icon: Activity },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/tests", label: "Test catalog", icon: FlaskConical },
  { href: "/catalog", label: "Catalog settings", icon: Settings },
];

type SessionUser = { role: "ADMIN" | "LAB"; name: string; email: string };

export default function AppShell({
  children,
  title,
  eyebrow = "Laboratory information system",
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => {
        if (response.status === 401) {
          router.push("/login");
          return null;
        }
        return response.json();
      })
      .then((data) => { if (data?.success) setUser(data.user); })
      .catch(() => {});
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user?.name ? user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "…";

  return (
    <div className="app-shell min-h-screen bg-[#f5f8f7] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white print:hidden lg:block">
        <Brand labName={user?.name} />
        <nav className="space-y-1 px-3 py-5" aria-label="Primary navigation">
          {navigation.map((item) => <NavItem key={`${item.href}-${item.label}`} item={item} />)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 p-4 text-xs text-slate-400">{user?.name ?? "Laboratory"}<br />Clinical workspace</div>
      </aside>

      {isOpen && <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white transition-transform lg:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><Brand labName={user?.name} /><button type="button" className="mr-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close navigation" onClick={() => setIsOpen(false)}><X size={19} /></button></div>
        <nav className="space-y-1 px-3 py-5">{navigation.map((item) => <NavItem key={`${item.href}-mobile-${item.label}`} item={item} onNavigate={() => setIsOpen(false)} />)}</nav>
      </aside>

      <div className="app-main lg:pl-64 print:pl-0">
        <header className="app-header sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
          <div className="flex h-16 items-center justify-between px-5 lg:px-8">
            <div className="flex items-center gap-3"><button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation" onClick={() => setIsOpen(true)}><Menu size={20} /></button><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p><h1 className="text-base font-semibold text-slate-950">{title}</h1></div></div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user?.name ?? "…"}</p><p className="text-xs text-slate-500">{user?.email ?? ""}</p></div>
              <div className="flex size-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">{initials}</div>
              <button type="button" onClick={logout} title="Logout" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"><LogOut size={18} /></button>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function Brand({ labName }: { labName?: string }) {
  const words = (labName || "Northstar Diagnostics").trim().split(/\s+/);
  const first = words[0] || "LAB";
  const rest = words.slice(1).join(" ");
  return <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white"><FlaskConical size={21} /></span><span><span className="block text-sm font-bold tracking-[0.18em] text-teal-800">{first.toUpperCase()}</span><span className="block text-xs text-slate-500">{rest || "Laboratory"}</span></span></Link>;
}

function NavItem({ item, onNavigate }: { item: (typeof navigation)[number]; onNavigate?: () => void }) {
  const Icon = item.icon;
  return <Link href={item.href} onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"><Icon size={17} />{item.label}</Link>;
}
