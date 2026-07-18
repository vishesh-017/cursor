"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  MapPinned,
  PlusCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  InfrastructureReport,
  LeaderboardEntry,
  NotificationItem,
  SessionUser,
  UrbanPulseMetrics,
  UserProfile,
} from "@/types";

export default function CitizenDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [nearby, setNearby] = useState<InfrastructureReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pulse, setPulse] = useState<UrbanPulseMetrics | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meJson = (await meRes.json()) as {
          success: boolean;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        if (!meRes.ok || !meJson.success || !meJson.data) throw new Error("Session failed");

        const citizenId = meJson.data.user.id;
        const [reportsRes, allRes, notifRes, analyticsRes, metaRes] =
          await Promise.all([
            fetch(`/api/reports?citizenId=${encodeURIComponent(citizenId)}`, {
              cache: "no-store",
            }),
            fetch("/api/reports", { cache: "no-store" }),
            fetch("/api/notifications", { cache: "no-store" }),
            fetch("/api/analytics", { cache: "no-store" }),
            fetch("/api/meta", { cache: "no-store" }),
          ]);

        const myReports = (await reportsRes.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
        };
        const allReports = (await allRes.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
        };
        const notifJson = (await notifRes.json()) as {
          success: boolean;
          data?: { notifications: NotificationItem[] };
        };
        const analyticsJson = (await analyticsRes.json()) as {
          success: boolean;
          data?: { urbanPulse: UrbanPulseMetrics };
        };
        const metaJson = (await metaRes.json()) as {
          success?: boolean;
          data?: { leaderboard?: LeaderboardEntry[] };
        };

        if (!active) return;
        setUser(meJson.data.user);
        setProfile(meJson.data.profile ?? null);
        setReports(myReports.data?.reports ?? []);
        setNotifications(notifJson.data?.notifications ?? []);
        setPulse(analyticsJson.data?.urbanPulse ?? null);
        const entry = metaJson.data?.leaderboard?.find(
          (e) => e.userId === citizenId
        );
        setRank(entry?.rank ?? null);

        const ward = meJson.data.user.ward;
        setNearby(
          (allReports.data?.reports ?? [])
            .filter((r) => r.ward === ward && r.status !== "resolved")
            .slice(0, 4)
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const resolved = reports.filter((r) => r.status === "resolved").length;
  const open = reports.filter((r) => r.status !== "resolved" && r.status !== "rejected").length;
  const livePoints =
    profile?.points ??
    reports.reduce((sum, r) => sum + (r.pointsAwarded ?? 0), 0);
  const impact = Math.min(99, Math.round(livePoints / 15 + resolved * 4));
  const aiDetections = reports.filter((r) => r.ai).slice(0, 3);
  const chart = pulse?.monthlyTrends ?? [
    { month: "Feb", opened: 2, closed: 1 },
    { month: "Mar", opened: 3, closed: 2 },
    { month: "Apr", opened: 4, closed: 3 },
    { month: "May", opened: 5, closed: 4 },
    { month: "Jun", opened: 6, closed: 5 },
    { month: "Jul", opened: open + 2, closed: resolved },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[18px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-slate-950 text-white shadow-[var(--shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(43,181,174,0.35),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(224,138,82,0.25),transparent_35%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              Citizen command center
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Namaste, {profile?.name.split(" ")[0] ?? "Citizen"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Your civic pulse for {user?.ward ?? "Ahmedabad"} — track monsoon
              drainage, streetlight outages, and reward progress with Ahmedabad
              Municipal Corporation.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/citizen/reports/new">
                <Button className="rounded-2xl bg-teal-400 text-slate-950 hover:bg-teal-300">
                  <PlusCircle className="h-4 w-4" />
                  Quick report
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="outline" className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <MapPinned className="h-4 w-4" />
                  Nearby map
                </Button>
              </Link>
              <Link href="/ai">
                <Button variant="outline" className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <Sparkles className="h-4 w-4" />
                  AI Lab
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-slate-300">Citizen impact</p>
              <p className="mt-2 font-display text-4xl font-semibold">{impact}</p>
              <Progress value={impact} className="mt-3 bg-white/10" tone="brand" />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-slate-300">Urban Pulse</p>
              <p className="mt-2 font-display text-4xl font-semibold">
                {pulse?.urbanPulseIndex ?? 78}
              </p>
              <p className="mt-3 text-xs text-teal-200">Citywide index</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Reports submitted"
          value={reports.length}
          icon={PlusCircle}
          hint={`${open} currently open`}
          delay={0.05}
        />
        <KpiCard
          label="Reports resolved"
          value={resolved}
          icon={CheckCircle2}
          hint="Verified by AMC crews"
          delay={0.1}
        />
        <KpiCard
          label="Civic points"
          value={livePoints}
          icon={Award}
          hint={`${profile?.badges.length ?? 0} badges · see Rewards for criteria`}
          delay={0.15}
        />
        <KpiCard
          label="Leaderboard rank"
          value={rank ? `#${rank}` : "—"}
          icon={Trophy}
          hint={`${user?.ward ?? "Ward"} · live city ranking`}
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5">
          <PageHeader
            eyebrow="Infrastructure health"
            title={`${pulse?.infrastructureHealth ?? 76} / 100`}
            description="Composite readiness across roads, water, drainage, and lighting for Ahmedabad."
          />
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="civic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6e6a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d6e6a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="opened"
                  stroke="#0d6e6a"
                  fill="url(#civic)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Sparkles className="h-4 w-4" />
            <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
              Recent AI detections
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {aiDetections.length ? (
              aiDetections.map((report) => (
                <Link
                  key={report.id}
                  href={`/citizen/reports/${report.id}`}
                  className="block rounded-2xl border border-[var(--border)] bg-white/50 p-3 transition hover:border-[var(--brand)] dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{report.title}</p>
                    <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {report.ai?.detection} · {(report.ai!.confidence * 100).toFixed(0)}% confidence
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Submit a report to generate Exa AI detections.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="font-display text-xl font-semibold">Nearby active issues</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Open tickets in {user?.ward ?? "your ward"}
          </p>
          <div className="mt-4 space-y-3">
            {nearby.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{issue.title}</p>
                  <p className="text-xs text-[var(--muted)]">{issue.address}</p>
                </div>
                <Badge tone={statusTone(issue.status)}>
                  {issue.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-display text-xl font-semibold">Live civic updates</h2>
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-2xl border border-[var(--border)] px-3 py-3 transition hover:bg-white/60 dark:hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {!item.read ? <Badge tone="accent">New</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
