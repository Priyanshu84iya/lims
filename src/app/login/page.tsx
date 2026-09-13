"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginMode = "SELECT" | "ADMIN" | "LAB";

const fieldClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pl-10 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("SELECT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectMode(next: LoginMode) {
    setMode(next);
    setError("");
    setEmail("");
    setPassword("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: mode, email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Login failed.");
      router.push(data.role === "ADMIN" ? "/admin" : "/");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f7] px-5 py-10 text-slate-900">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-teal-700 text-white"><FlaskConical size={24} /></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Northstar Diagnostics</h1>
          <p className="mt-1 text-sm text-slate-500">Laboratory Information System — secure sign in</p>
        </div>

        {mode === "SELECT" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => selectMode("ADMIN")} className="group rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:border-teal-500 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-yellow-400"><ShieldCheck size={22} /></span>
              <p className="mt-4 text-lg font-semibold">Admin Login</p>
              <p className="mt-1 text-sm text-slate-500">Platform administration — register and manage laboratories.</p>
              <p className="mt-4 text-sm font-semibold text-teal-700 group-hover:underline">Sign in as admin →</p>
            </button>
            <button type="button" onClick={() => selectMode("LAB")} className="group rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:border-teal-500 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-teal-700 text-white"><FlaskConical size={22} /></span>
              <p className="mt-4 text-lg font-semibold">Lab Login</p>
              <p className="mt-1 text-sm text-slate-500">Laboratory workspace — patients, reports, and test catalog.</p>
              <p className="mt-4 text-sm font-semibold text-teal-700 group-hover:underline">Sign in as lab →</p>
            </button>
          </div>
        ) : (
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <button type="button" onClick={() => selectMode("SELECT")} className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700"><ArrowLeft size={15} /> Back</button>
              <CardTitle className="flex items-center gap-2.5">
                {mode === "ADMIN" ? <ShieldCheck size={20} className="text-slate-700" /> : <FlaskConical size={20} className="text-teal-700" />}
                {mode === "ADMIN" ? "Admin Login" : "Lab Login"}
              </CardTitle>
              <p className="text-sm text-slate-500">{mode === "ADMIN" ? "Use your platform administrator credentials." : "Use the credentials provided by your administrator."}</p>
            </CardHeader>
            <CardContent>
              {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <Input id="login-email" type="email" autoComplete="username" className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={mode === "ADMIN" ? "admin@example.com" : "lab@example.com"} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <Input id="login-password" type="password" autoComplete="current-password" className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Signing in..." : `Sign in as ${mode === "ADMIN" ? "Admin" : "Lab"}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
