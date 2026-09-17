"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FlaskConical, Inbox, LogOut, Pencil, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LabLogoUpload } from "@/components/lab-logo-upload";
import { LabSignatureUpload } from "@/components/lab-signature-upload";

type LabRow = {
  id: number;
  name: string;
  email: string;
  loginEmail: string;
  phoneCountryCode: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  registrationNumber: string | null;
  licenseNumber: string | null;
  gstNumber: string | null;
  website: string | null;
  directorName: string | null;
  directorQualification: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  patientsCount: number;
  reportsCount: number;
  createdAt: string;
};

const EMPTY_FORM = {
  name: "", email: "", loginEmail: "", password: "",
  phoneCountryCode: "+91", phone: "",
  address: "", city: "", state: "", pincode: "",
  registrationNumber: "", licenseNumber: "", gstNumber: "", website: "",
  directorName: "", directorQualification: "", logoUrl: "", signatureUrl: "",
};

const fieldClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

export default function AdminPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingLabId, setEditingLabId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadLabs = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/labs", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to load laboratories.");
      setLabs(data.labs);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load laboratories.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/labs", { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401 || response.status === 403) {
          router.push("/login");
          return;
        }
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Failed to load laboratories.");
        setLabs(data.labs);
        setError("");
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load laboratories.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingLabId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function startEdit(lab: LabRow) {
    setNotice("");
    setFormError("");
    setShowForm(true);
    setEditingLabId(lab.id);
    setForm({
      name: lab.name,
      email: lab.email,
      loginEmail: lab.loginEmail,
      password: "",
      phoneCountryCode: lab.phoneCountryCode || "+91",
      phone: lab.phone || "",
      address: lab.address || "",
      city: lab.city || "",
      state: lab.state || "",
      pincode: lab.pincode || "",
      registrationNumber: lab.registrationNumber || "",
      licenseNumber: lab.licenseNumber || "",
      gstNumber: lab.gstNumber || "",
      website: lab.website || "",
      directorName: lab.directorName || "",
      directorQualification: lab.directorQualification || "",
      logoUrl: lab.logoUrl || "",
      signatureUrl: lab.signatureUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitLab(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.loginEmail.trim()) {
      setFormError("Lab name and login email are required.");
      return;
    }
    if (!editingLabId && !form.password) {
      setFormError("Lab name, login email, and password are required.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch(
        editingLabId ? `/api/admin/labs/${editingLabId}` : "/api/admin/labs",
        {
          method: editingLabId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to save laboratory.");
      closeForm();
      setNotice(editingLabId ? "Laboratory updated successfully." : "Laboratory registered successfully.");
      await loadLabs();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Failed to save laboratory.");
    } finally {
      setIsSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-yellow-400"><ShieldCheck size={20} /></span>
            <div>
              <p className="text-base font-semibold">Admin Console</p>
              <p className="text-xs text-slate-500">Northstar Diagnostics — laboratory management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/messages"><Inbox size={15} /> Messages</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={logout}><LogOut size={15} /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Registered Laboratories</h1>
            <p className="mt-0.5 text-sm text-slate-500">Each lab gets unique login credentials and an isolated workspace.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLabs} disabled={isLoading}><RefreshCw size={15} /> Refresh</Button>
            <Button size="sm" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
              {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? "Close" : "Add Lab"}
            </Button>
          </div>
        </div>

        {notice && !showForm && (
          <p className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{notice}</p>
        )}

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-teal-700" />
                {editingLabId ? "Edit Laboratory" : "Register New Laboratory"}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {editingLabId
                  ? "Update the lab details below. Leave the password blank to keep the current password."
                  : "The lab will sign in with the login email and password below."}
              </p>
            </CardHeader>
            <CardContent>
              {formError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</p>}
              <form onSubmit={submitLab} className="space-y-6">
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Laboratory details</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="lab-name">Lab name *</Label><Input id="lab-name" className={fieldClass} value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="City Diagnostics" /></div>
                    <div><Label htmlFor="lab-email">Lab email</Label><Input id="lab-email" type="email" className={fieldClass} value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="info@citydiagnostics.com" /></div>
                    <div className="sm:col-span-2">
                      <Label>Phone</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Select
                          value={COUNTRIES.find((country) => country.code === form.phoneCountryCode)?.iso ?? "IN"}
                          onValueChange={(iso) => {
                            const country = COUNTRIES.find((entry) => entry.iso === iso);
                            if (country) updateField("phoneCountryCode", country.code);
                          }}
                        >
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.iso} value={country.iso}>{flagEmoji(country.iso)} {country.name} ({country.code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input className={fieldClass + " !mt-0 flex-1"} value={form.phone} onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="sm:col-span-2"><Label htmlFor="lab-address">Address</Label><Input id="lab-address" className={fieldClass} value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Street address" /></div>
                    <div><Label htmlFor="lab-city">City</Label><Input id="lab-city" className={fieldClass} value={form.city} onChange={(e) => updateField("city", e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label htmlFor="lab-state">State</Label><Input id="lab-state" className={fieldClass} value={form.state} onChange={(e) => updateField("state", e.target.value)} /></div>
                      <div><Label htmlFor="lab-pincode">Pincode</Label><Input id="lab-pincode" className={fieldClass} value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} /></div>
                    </div>
                  </div>
                </section>

                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Login credentials</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="lab-login-email">Login email *</Label><Input id="lab-login-email" type="email" className={fieldClass} value={form.loginEmail} onChange={(e) => updateField("loginEmail", e.target.value)} placeholder="lab@example.com" /></div>
                    <div>
                      <Label htmlFor="lab-password">{editingLabId ? "New password (leave blank to keep current)" : "Password * (min 8 characters)"}</Label>
                      <Input id="lab-password" type="password" autoComplete="new-password" className={fieldClass} value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                </section>

                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Registration & compliance</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="lab-reg">Registration number</Label><Input id="lab-reg" className={fieldClass} value={form.registrationNumber} onChange={(e) => updateField("registrationNumber", e.target.value)} /></div>
                    <div><Label htmlFor="lab-license">License number</Label><Input id="lab-license" className={fieldClass} value={form.licenseNumber} onChange={(e) => updateField("licenseNumber", e.target.value)} /></div>
                    <div><Label htmlFor="lab-gst">GST number</Label><Input id="lab-gst" className={fieldClass} value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value)} /></div>
                    <div><Label htmlFor="lab-website">Website</Label><Input id="lab-website" className={fieldClass} value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://" /></div>
                  </div>
                </section>

                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Medical director / pathologist</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="lab-director">Name</Label><Input id="lab-director" className={fieldClass} value={form.directorName} onChange={(e) => updateField("directorName", e.target.value)} placeholder="Dr. Jane Doe" /></div>
                    <div><Label htmlFor="lab-qualification">Qualification</Label><Input id="lab-qualification" className={fieldClass} value={form.directorQualification} onChange={(e) => updateField("directorQualification", e.target.value)} placeholder="MD Pathology" /></div>
                    <div className="sm:col-span-2"><Label>Lab logo</Label><div className="mt-1.5"><LabLogoUpload value={form.logoUrl} onChange={(url) => updateField("logoUrl", url)} /></div></div>
                    <div className="sm:col-span-2"><Label>Authorized signature (PNG)</Label><div className="mt-1.5"><LabSignatureUpload value={form.signatureUrl} onChange={(url) => updateField("signatureUrl", url)} /></div></div>
                  </div>
                </section>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : editingLabId ? "Save Changes" : "Register Laboratory"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {error && <p className="m-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
            {isLoading ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">Loading laboratories...</p>
            ) : labs.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <FlaskConical size={28} className="text-slate-300" />
                <p className="mt-3 text-sm font-medium">No laboratories registered yet</p>
                <p className="mt-1 text-sm text-slate-500">Click &quot;Add Lab&quot; to register the first laboratory.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab</TableHead>
                    <TableHead>Login email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead className="text-right">Patients</TableHead>
                    <TableHead className="text-right">Reports</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium">{lab.name}</TableCell>
                      <TableCell>{lab.loginEmail}</TableCell>
                      <TableCell>{lab.phone ? `${lab.phoneCountryCode ?? ""} ${lab.phone}` : "—"}</TableCell>
                      <TableCell>{[lab.city, lab.state].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>{lab.registrationNumber || lab.licenseNumber || "—"}</TableCell>
                      <TableCell>{lab.directorName || "—"}</TableCell>
                      <TableCell className="text-right">{lab.patientsCount}</TableCell>
                      <TableCell className="text-right">{lab.reportsCount}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => startEdit(lab)}>
                          <Pencil size={14} /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
