"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Minus, RotateCcw, Send, X } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string; time: string };

const SUGGESTED_QUESTIONS = [
  "What is this LIMS?",
  "What features are available?",
  "How can I contact you?",
];

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi there! I'm the LIMS Assistant. Ask me anything about this website — what it does, its features, or how to get in touch.",
  time: "",
};

const MAX_MESSAGE_LENGTH = 1000;

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LimsChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError("");
    const userMessage: ChatMessage = { role: "user", content: trimmed.slice(0, MAX_MESSAGE_LENGTH), time: now() };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    try {
      const history = messages
        .filter((message) => message !== GREETING)
        .map((message) => ({ role: message.role, content: message.content }));
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, history }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "The assistant is having trouble responding right now.");
      }
      setMessages((current) => [...current, { role: "assistant", content: data.reply, time: now() }]);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The assistant is having trouble responding right now."
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  function newConversation() {
    setMessages([GREETING]);
    setError("");
    inputRef.current?.focus();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none sm:inset-auto sm:bottom-5 sm:right-5">
      {open && (
        <section
          aria-label="LIMS Assistant chat"
          className="pointer-events-auto mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-[#efeae2] shadow-2xl animate-chat-open sm:mx-0 sm:h-[34rem] sm:max-h-[calc(100dvh-6rem)] sm:w-[24rem] sm:rounded-2xl"
        >
          {/* Header */}
          <header className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <MessageCircle size={20} className="text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">LIMS Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="size-1.5 rounded-full bg-[#25d366]" /> Online
              </p>
            </div>
            <button
              type="button"
              onClick={newConversation}
              title="New conversation"
              aria-label="Start a new conversation"
              className="rounded-full p-1.5 text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Minimize"
              aria-label="Minimize chat"
              className="rounded-full p-1.5 text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Close"
              aria-label="Close chat"
              className="rounded-full p-1.5 text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="chat-pattern flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3.5 py-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "rounded-tr-sm bg-[#dcf8c6] text-slate-800"
                      : "rounded-tl-sm bg-white text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.time && (
                    <p className="mt-1 text-right text-[10px] text-slate-400">{message.time}</p>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="chat-dot animate-chat-blink" />
                    <span className="chat-dot animate-chat-blink [animation-delay:0.2s]" />
                    <span className="chat-dot animate-chat-blink [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center px-2">
                <div className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                  <p className="break-words">{error}</p>
                  <button
                    type="button"
                    onClick={() => send(messages[messages.length - 1]?.role === "user" ? messages[messages.length - 1].content : "")}
                    className="mt-1 font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {messages.length === 1 && !sending && (
              <div className="flex flex-wrap gap-2 px-1 pt-1">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => send(question)}
                    className="rounded-full border border-[#25d366]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#075e54] shadow-sm transition hover:bg-[#25d366]/10"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 bg-[#f0f0f0] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type a message…"
              aria-label="Type your message"
              className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white shadow transition hover:bg-[#20bd5a] disabled:opacity-40"
            >
              <Send size={17} />
            </button>
          </div>
        </section>
      )}

      {/* Floating button */}
      {!open && (
        <div className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open LIMS Assistant chat"
            className="group relative flex size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/20 transition hover:bg-[#20bd5a] animate-chat-pulse"
          >
            <MessageCircle size={26} className="transition-transform group-hover:scale-110" />
          </button>
        </div>
      )}
    </div>
  );
}
