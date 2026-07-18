"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { ReportTable } from "@/components/shared/report-table";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  InfrastructureReport,
  NotificationItem,
  SessionUser,
  UserProfile,
} from "@/types";

type MePayload = {
  user: SessionUser;
  profile: UserProfile | undefined;
};

export default function CitizenDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meJson = (await meRes.json()) as {
          success: boolean;
          data?: MePayload;
          message?: string;
        };
        if (!meRes.ok || !meJson.success || !meJson.data) {
          throw new Error(meJson.message || "Unable to load session");
        }

        const citizenId = meJson.data.user.id;
        const [reportsRes, notifRes] = await Promise.all([
          fetch(`/api/reports?citizenId=${encodeURIComponent(citizenId)}`, {
            cache: "no-store",
          }),
          fetch("/api/notifications", { cache: "no-store" }),
        ]);

        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
          message?: string;
        };
        const notifJson = (await notifRes.json()) as {
          success: boolean;
          data?: { notifications: NotificationItem[] };
          message?: string;
        };

        if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
          throw new Error(reportsJson.message || "Unable to load reports");
        }
        if (!notifRes.ok || !notifJson.success || !notifJson.data) {
          throw new Error(notifJson.message || "Unable to load notifications");
        }

        if (!active) return;
        setProfile(meJson.data.profile ?? null);
        setReports(reportsJson.data.reports);
        setNotifications(notifJson.data.notifications);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Dashboard failed to load");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const openCount = reports.filter((r) => r.status !== "resolved" && r.status !== "rejected").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const criticalCount = reports.filter((r) => r.priority === "critical").length;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Citizen dashboard
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            Namaste{profile ? `, ${profile.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track your Vastrapur and city-wide civic reports, monsoon alerts, and
            reward progress for Ahmedabad Municipal Corporation.
          </p>
        </div>
        <Link href="/citizen/reports/new">
          <Button>Report an issue</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {error ? (
        <EmptyState
          title="Could not load dashboard"
          description={error}
          action={
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          }
        />
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="My reports" value={reports.length} hint="All submissions" />
            <StatCard label="Open tickets" value={openCount} hint="Awaiting AMC action" />
            <StatCard label="Resolved" value={resolvedCount} hint="Closed by crews" />
            <StatCard
              label="Civic points"
              value={profile?.points ?? 0}
              hint={`${unread} unread notifications · ${criticalCount} critical`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent reports</CardTitle>
                <Link href="/citizen/reports" className="text-sm font-medium text-teal-700 hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <EmptyState
                    title="No reports yet"
                    description="Flag a pothole, water leak, or drainage issue in your ward."
                    action={
                      <Link href="/citizen/reports/new">
                        <Button>Submit first report</Button>
                      </Link>
                    }
                  />
                ) : (
                  <ReportTable reports={reports.slice(0, 5)} hrefBase="/citizen/reports" />
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Latest updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-lg border border-slate-200 bg-white/70 p-3 transition hover:border-teal-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      {!item.read ? <Badge tone="brand">New</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.body}</p>
                  </Link>
                ))}
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No notifications yet.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {reports[0] ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Spotlight issue</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{reports[0].title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {reports[0].ward} · {reports[0].address}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={priorityTone(reports[0].priority)}>{reports[0].priority}</Badge>
                    <Badge tone={statusTone(reports[0].status)}>
                      {reports[0].status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <Link href={`/citizen/reports/${reports[0].id}`}>
                  <Button variant="outline">Track status</Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
