"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  CheckCheck,
  CircleDot,
  Info,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationItem } from "@/types";

type FilterMode = "all" | "unread";

function iconFor(item: NotificationItem) {
  const hay = `${item.title} ${item.body}`.toLowerCase();
  if (hay.includes("badge") || hay.includes("reward") || hay.includes("points")) {
    return Award;
  }
  if (
    hay.includes("resolv") ||
    hay.includes("crew") ||
    hay.includes("repair") ||
    hay.includes("assigned")
  ) {
    return Wrench;
  }
  if (hay.includes("ai") || hay.includes("exa") || hay.includes("analysis")) {
    return Sparkles;
  }
  if (hay.includes("acknowledg") || hay.includes("status")) {
    return CircleDot;
  }
  return Info;
}

export default function CitizenNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { notifications: NotificationItem[] };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Unable to load notifications");
      }
      setItems(json.data.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { notification: NotificationItem };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Could not update notification");
      }
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function markAllRead() {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markRead(n.id)));
  }

  const unreadCount = items.filter((n) => !n.read).length;
  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.read);
    return items;
  }, [items, filter]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-[18px]" />
        <Skeleton className="h-28 w-full rounded-[18px]" />
        <Skeleton className="h-28 w-full rounded-[18px]" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Notifications unavailable"
        description={error}
        action={
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Civic inbox"
        title="Notification center"
        description="Status updates, badge unlocks, and AMC acknowledgements for your Ahmedabad infrastructure tickets."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => void markAllRead()}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="glass-card flex items-center gap-3 px-4 py-3">
          <Bell className="h-5 w-5 text-[var(--brand)]" />
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Unread
            </p>
            <p className="font-display text-2xl font-semibold">{unreadCount}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all" as const, label: "All" },
              { id: "unread" as const, label: "Unread" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                filter === chip.id
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {chip.label}
              {chip.id === "unread" ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "No unread alerts" : "Inbox is clear"}
          description="When AMC acknowledges or updates your tickets, alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const Icon = iconFor(item);
            return (
              <article
                key={item.id}
                className={`glass-card p-5 transition ${
                  item.read ? "opacity-90" : "ring-1 ring-[var(--brand)]/30"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      item.read
                        ? "bg-slate-200/70 text-[var(--muted)] dark:bg-white/10"
                        : "bg-[var(--brand-soft)] text-[var(--brand)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold">{item.title}</h2>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {new Date(item.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {!item.read ? (
                        <Badge tone="brand">Unread</Badge>
                      ) : (
                        <Badge tone="default">Read</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      {item.body}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!item.read ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void markRead(item.id)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                      <Link href={item.href}>
                        <Button size="sm">Open</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
