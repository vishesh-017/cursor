"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationItem } from "@/types";

export default function CitizenNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
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

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Status updates, badge unlocks, and AMC acknowledgements for your reports.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Inbox is clear"
          description="When AMC acknowledges or updates your tickets, alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                {!item.read ? <Badge tone="brand">Unread</Badge> : <Badge>Read</Badge>}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">{item.body}</p>
                <div className="flex gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
