"use client";

import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type ChatRole = "user" | "assistant";

export type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Array<{ title?: string | null; url?: string | null }>;
};

const SUGGESTIONS = [
  "How do I report a pothole?",
  "What are the demo login credentials?",
  "How does ticket status progress work?",
  "What does AI Lab show?",
  "Monsoon drainage tips for Ahmedabad",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const WELCOME: UiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I’m Nexus, your Urbanexus civic assistant. Ask about filing reports, wards, AMC departments, ticket status, or Ahmedabad infrastructure.",
};

export function ChatPanel({
  className,
  compact = false,
  onClose,
  showExpandLink = false,
}: {
  className?: string;
  compact?: boolean;
  onClose?: () => void;
  showExpandLink?: boolean;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: UiMessage = { id: uid(), role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory
            .filter((m) => m.id !== "welcome")
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: {
          answer: string;
          citations?: Array<{ title?: string | null; url?: string | null }>;
        };
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Chat failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: payload.data!.answer,
          citations: payload.data!.citations,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow)]",
        className
      )}
    >
      <header className="flex items-center gap-3 border-b border-[var(--border)] bg-gradient-to-r from-teal-800 to-slate-900 px-4 py-3 text-white sm:px-5 sm:py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 sm:h-11 sm:w-11">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold sm:text-lg">
            Nexus assistant
          </p>
          <p className="truncate text-xs text-teal-100/90">
            {compact
              ? "Urbanexus · Exa civic help"
              : "Exa-powered civic Q&A for Ahmedabad · Urbanexus"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showExpandLink ? (
            <Link
              href="/chat"
              className="rounded-xl px-2 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
              onClick={onClose}
            >
              Expand
            </Link>
          ) : (
            <Sparkles className="h-5 w-5 opacity-80" />
          )}
          {onClose ? (
            <button
              type="button"
              aria-label="Close chat"
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin sm:px-4",
          compact ? "min-h-0" : "min-h-[420px]"
        )}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-[var(--brand)] text-white"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-black/10 pt-2 text-xs dark:border-white/10">
                  {msg.citations.map((c, i) =>
                    c.url ? (
                      <li key={`${c.url}-${i}`}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          {c.title || c.url}
                        </a>
                      </li>
                    ) : null
                  )}
                </ul>
              ) : null}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 px-1 text-xs text-[var(--muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--border)] px-3 py-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => void send(s)}
              className="rounded-full border border-[var(--border)] bg-white/60 px-2.5 py-1 text-[11px] text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--foreground)] dark:bg-white/5"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 border-t border-[var(--border)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={compact ? 1 : 2}
          placeholder="Ask about reports, wards, AMC…"
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-white/80 px-3 py-2.5 text-sm outline-none ring-[var(--ring)] placeholder:text-[var(--muted)] focus:ring-2 dark:bg-white/5"
          aria-label="Chat message"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || !input.trim()}
          className="h-11 shrink-0 rounded-2xl px-3"
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
