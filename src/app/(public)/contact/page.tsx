"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicHeader } from "../../components/public-header";
import { PublicFooter } from "../../components/public-footer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactPage() {
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
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader />

      <main className="pt-16">
        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                Contact
              </p>
              <h1 className="animate-fade-up mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Get in touch
              </h1>
              <p className="animate-fade-up mt-6 text-base leading-relaxed text-slate-600">
                Have a question about Northstar Diagnostics, or want to learn how the platform can
                support your laboratory? Send us a message and we will respond as soon as possible.
              </p>
              <div className="animate-fade-up mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f8faf9] px-4 py-3.5 text-sm text-slate-600">
                <MessageSquare size={17} className="shrink-0 text-teal-700" />
                Messages go straight to the platform administrator&apos;s inbox.
              </div>
            </div>

            <form
              onSubmit={submit}
              noValidate
              className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
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
      </main>

      <PublicFooter />
    </div>
  );
}
