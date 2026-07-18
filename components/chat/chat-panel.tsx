"use client";

import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/types";
import { cn } from "@/utils/cn";

type ChatRole = "user" | "assistant";

export type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Array<{ title?: string | null; url?: string | null }>;
  source?: string;
};

const SUGGESTIONS = [
  "What's my report status?",
  "Which ward has the worst roads?",
  "How do I report a pothole?",
  "What does AI Lab show?",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Turn /citizen/reports/… paths into clickable links inside chat bubbles. */
function MessageBody({ content, isUser }: { content: string; isUser: boolean }) {
  const parts = content.split(/(\/[a-z][\w\-./]*)/gi);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith("/") && part.length > 2 && !part.includes(" ")) {
          return (
            <Link
              key={`${part}-${i}`}
              href={part}
              className={cn(
                "font-semibold underline underline-offset-2",
                isUser ? "text-white" : "text-teal-700 dark:text-teal-300"
              )}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

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
  const [userName, setUserName] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { success?: boolean; data?: { user: SessionUser } }) => {
        if (json.success && json.data?.user) {
          const first = json.data.user.name.split(" ")[0];
          setUserName(first);
          if (!greeted.current) {
            greeted.current = true;
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: `Hi ${first} - I'm Nexus. I can pull your live ticket status, show which wards have the most open road issues, or walk you through filing a report.`,
              },
            ]);
          }
        } else if (!greeted.current) {
          greeted.current = true;
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Hi - I'm Nexus, your Urbanexus civic assistant. Sign in to ask about your tickets, or ask which wards have the worst open road issues.",
            },
          ]);
        }
      })
      .catch(() => {
        if (!greeted.current) {
          greeted.current = true;
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Hi - I'm Nexus. Ask about filing reports, your ticket status, or Ahmedabad ward road pressure.",
            },
          ]);
        }
      });
  }, []);

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
          source?: string;
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
          source: payload.data!.source,
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
      <header className="relative overflow-hidden border-b border-teal-900/40 bg-[#0b1f24] px-4 py-3.5 text-white sm:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(45,190,170,0.35),transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-400/20 ring-1 ring-teal-300/30 sm:h-11 sm:w-11">
            <Bot className="h-5 w-5 text-teal-100" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold sm:text-lg">
              Nexus
            </p>
            <p className="truncate text-xs text-teal-100/85">
              {userName
                ? `Live tickets · ${userName}'s desk`
                : "Live Urbanexus data · Exa when needed"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 hidden items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 ring-1 ring-emerald-300/25 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Online
            </span>
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
        </div>
      </header>

      <div
        className={cn(
          "flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.06),transparent_40%)] px-3 py-3 scrollbar-thin sm:px-4",
          compact ? "min-h-0" : "min-h-[420px]"
        )}
      >
        {messages.length === 0 ? (
          <div className="flex items-center gap-2 px-1 text-xs text-[var(--muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Starting Nexus…
          </div>
        ) : null}
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
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                msg.role === "user"
                  ? "rounded-br-md bg-[var(--brand)] text-white"
                  : "rounded-bl-md border border-[var(--border)] bg-white/90 text-[var(--foreground)] dark:bg-white/5"
              )}
            >
              <MessageBody content={msg.content} isUser={msg.role === "user"} />
              {msg.source === "live" ? (
                <p
                  className={cn(
                    "mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    msg.role === "user" ? "text-white/70" : "text-teal-700/80"
                  )}
                >
                  Live Urbanexus data
                </p>
              ) : null}
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
            Checking live tickets…
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
              className="rounded-full border border-[var(--border)] bg-teal-50/80 px-2.5 py-1 text-[11px] font-medium text-teal-900 transition hover:border-teal-400 dark:bg-teal-500/10 dark:text-teal-100"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 border-t border-[var(--border)] bg-[var(--surface-solid)] p-3"
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
          placeholder={
            userName
              ? `${userName}, ask about your tickets or ward roads…`
              : "Ask about reports, wards, AMC…"
          }
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
