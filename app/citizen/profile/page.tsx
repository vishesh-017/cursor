"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, CalendarDays, MapPinned, Sparkles } from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Badge as BadgeType,
  InfrastructureReport,
  SessionUser,
  UserProfile,
} from "@/types";

export default function CitizenProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
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
          message?: string;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        if (!meRes.ok || !meJson.success || !meJson.data) {
          throw new Error(meJson.message || "Unable to load profile");
        }

        const citizenId = meJson.data.user.id;
        const [metaRes, reportsRes] = await Promise.all([
          fetch("/api/meta", { cache: "no-store" }),
          fetch(`/api/reports?citizenId=${encodeURIComponent(citizenId)}`, {
            cache: "no-store",
          }),
        ]);

        const metaJson = (await metaRes.json()) as {
          success: boolean;
          data?: { badges: BadgeType[] };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
        };

        if (!active) return;
        setUser(meJson.data.user);
        setProfile(meJson.data.profile ?? null);
        setBadges(metaJson.data?.badges ?? []);
        setReports(reportsJson.data?.reports ?? []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load");
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

  const civicScore = useMemo(() => {
    if (!profile) return 0;
    return Math.min(
      99,
      Math.round(profile.points / 18 + profile.resolvedCount * 5 + profile.badges.length * 4)
    );
  }, [profile]);

  const monthlyChart = useMemo(() => {
    const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const base = profile?.reportsCount ?? 0;
    return months.map((month, index) => ({
      month,
      reports: Math.max(0, Math.round(base * ((index + 2) / 8))),
      resolved: Math.max(0, Math.round((profile?.resolvedCount ?? 0) * ((index + 1) / 7))),
    }));
  }, [profile]);

  const activity = useMemo(() => {
    return [...reports]
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 6);
  }, [reports]);

  const earned = new Set(profile?.badges ?? []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-48 w-full rounded-[18px]" />
      </div>
    );
  }

  if (error || !user || !profile) {
    return (
      <EmptyState
        title="Profile unavailable"
        description={error ?? "Could not load your citizen profile."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-slate-950 text-white shadow-[var(--shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(43,181,174,0.35),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(224,138,82,0.22),transparent_35%)]" />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <Image
            src={profile.avatarUrl}
            alt={profile.name}
            width={96}
            height={96}
            className="rounded-3xl object-cover ring-2 ring-white/20"
          />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              Citizen profile
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
              {profile.name}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {profile.email} · {profile.phone}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="brand">{profile.role}</Badge>
              <Badge tone="info">{profile.ward} ward</Badge>
              <Badge>
                Joined{" "}
                {new Date(profile.joinedAt).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}
              </Badge>
            </div>
          </div>
          <div className="min-w-[160px] rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs text-slate-300">Civic score</p>
            <p className="mt-1 font-display text-4xl font-semibold">{civicScore}</p>
            <Progress value={civicScore} className="mt-3 bg-white/10" tone="brand" />
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="Ahmedabad standing"
        title="Your civic footprint"
        description={`Session ${user.name} · home ward ${user.ward} · ID ${user.id}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Civic points" value={profile.points} icon={Award} delay={0.05} />
        <KpiCard
          label="Reports filed"
          value={profile.reportsCount}
          icon={MapPinned}
          delay={0.1}
        />
        <KpiCard
          label="Resolved"
          value={profile.resolvedCount}
          icon={Sparkles}
          delay={0.15}
        />
        <KpiCard
          label="Badges"
          value={profile.badges.length}
          icon={CalendarDays}
          hint={`${badges.length} in catalogue`}
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Monthly civic activity</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Report & resolution cadence for your Ahmedabad account
          </p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6e6a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d6e6a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stroke="#0d6e6a"
                  fill="url(#profileFill)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#c45c26"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Badges</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Unlocked vs city catalogue</p>
          <div className="mt-4 space-y-3">
            {badges.slice(0, 5).map((badge) => {
              const unlocked = earned.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-3 ${
                    unlocked
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {badge.icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {badge.pointsRequired} pts
                      </p>
                    </div>
                  </div>
                  <Badge tone={unlocked ? "success" : "default"}>
                    {unlocked ? "Earned" : "Locked"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Activity timeline</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Recent ticket updates from your civic reports
        </p>
        <div className="mt-5 space-y-4">
          {activity.length ? (
            activity.map((report) => (
              <div
                key={report.id}
                className="relative border-l-2 border-[var(--brand)] pl-4"
              >
                <p className="text-sm font-semibold">{report.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(report.updatedAt).toLocaleString("en-IN")} ·{" "}
                  {report.status.replace("_", " ")} · {report.ward}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{report.address}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Submit your first report to start a civic timeline.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
