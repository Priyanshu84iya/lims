"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Inbox,
  LogOut,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Message = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [selected, setSelected] = useState<Message | null>(null);
  const [notice, setNotice] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/messages", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to load messages.");
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load messages.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const visibleMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return messages.filter((message) => {
      if (filter === "UNREAD" && message.isRead) return false;
      if (filter === "READ" && !message.isRead) return false;
      if (!query) return true;
      return `${message.name} ${message.email} ${message.subject} ${message.message}`
        .toLowerCase()
        .includes(query);
    });
  }, [messages, search, filter]);

  async function openMessage(message: Message) {
    setSelected(message);
    if (!message.isRead) await toggleRead(message.id, true);
  }

  async function toggleRead(id: number, isRead: boolean) {
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to update message.");
      setMessages((current) =>
        current.map((message) => (message.id === id ? { ...message, isRead } : message))
      );
      setUnreadCount((count) => count + (isRead ? -1 : 1));
      setSelected((current) => (current && current.id === id ? { ...current, isRead } : current));
    } catch (updateError) {
      setNotice(updateError instanceof Error ? updateError.message : "Failed to update message.");
    }
  }

  async function deleteMessage(id: number) {
    try {
      const response = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to delete message.");
      const removed = messages.find((message) => message.id === id);
      setMessages((current) => current.filter((message) => message.id !== id));
      if (removed && !removed.isRead) setUnreadCount((count) => Math.max(0, count - 1));
      if (selected?.id === id) setSelected(null);
      setNotice("Message deleted.");
    } catch (deleteError) {
      setNotice(deleteError instanceof Error ? deleteError.message : "Failed to delete message.");
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
          <nav className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/admin"><Building2 size={15} /> Laboratories</a>
            </Button>
            <Button size="sm" asChild>
              <a href="/admin/messages"><Inbox size={15} /> Messages{unreadCount > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}</a>
            </Button>
            <Button variant="outline" size="sm" onClick={logout}><LogOut size={15} /> Logout</Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Contact Messages</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Inquiries submitted through the public contact form.
              {unreadCount > 0 && <span className="ml-1 font-semibold text-teal-700">{unreadCount} unread</span>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadMessages} disabled={isLoading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>

        {notice && (
          <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">{notice}</p>
        )}
        {error && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, subject, or message"
            />
          </label>
          <div className="flex gap-2">
            {(["ALL", "UNREAD", "READ"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-teal-700 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value === "ALL" ? "All" : value === "UNREAD" ? "Unread" : "Read"}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading messages…</p>
        ) : visibleMessages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Inbox size={28} className="text-slate-300" />
              <p className="text-sm text-slate-500">No messages match your search or filter.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {visibleMessages.map((message) => (
              <li key={message.id}>
                <Card className={!message.isRead ? "border-teal-300 bg-teal-50/30" : ""}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={() => openMessage(message)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        {!message.isRead && <span className="size-2 shrink-0 rounded-full bg-teal-600" aria-label="Unread" />}
                        <p className={`truncate font-semibold ${message.isRead ? "text-slate-700" : "text-slate-950"}`}>
                          {message.subject}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {message.name} · {message.email}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-400">{message.message}</p>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs text-slate-400 sm:block">{formatDateTime(message.createdAt)}</span>
                      <Button variant="outline" size="sm" onClick={() => toggleRead(message.id, !message.isRead)}>
                        {message.isRead ? <MailOpen size={15} /> : <Mail size={15} />}
                        {message.isRead ? "Unread" : "Read"}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteMessage(message.id)}>
                        <Trash2 size={15} /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subject}</DialogTitle>
                <DialogDescription>
                  {selected.name} · {selected.email}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.message}</p>
              <p className="text-xs text-slate-400">Submitted {formatDateTime(selected.createdAt)}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
