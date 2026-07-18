"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Check,
  Gift,
  Lock,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveBadgeIcon } from "@/utils/badge-icons";
import { cn } from "@/utils/cn";
import type { Badge as BadgeType, Reward, SessionUser, UserProfile } from "@/types";

const achievements = [
  {
    id: "monsoon",
    title: "Monsoon Sentinel",
    blurb: "Flag drainage overflows before peak monsoon hours in your ward.",
    target: 3,
    metricKey: "resolved" as const,
  },
  {
    id: "ward",
    title: "Ward Guardian",
    blurb: "Keep Vastrapur / Thaltej corridors visible with verified tickets.",
    target: 5,
    metricKey: "reports" as const,
  },
  {
    id: "streak",
    title: "Civic Streak",
    blurb: "Sustain reporting across consecutive AMC inspection weeks.",
    target: 800,
    metricKey: "points" as const,
  },
];

export default function CitizenRewardsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [meRes, metaRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/meta", { cache: "no-store" }),
        ]);

        const meJson = (await meRes.json()) as {
          success: boolean;
          message?: string;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        const metaJson = (await metaRes.json()) as {
          success: boolean;
          message?: string;
          data?: { badges: BadgeType[]; rewards: Reward[] };
        };

        if (!meRes.ok || !meJson.success || !meJson.data) {
          throw new Error(meJson.message || "Unable to load profile");
        }
        if (!metaRes.ok || !metaJson.success || !metaJson.data) {
          throw new Error(metaJson.message || "Unable to load rewards");
        }

        if (!active) return;
        setProfile(meJson.data.profile ?? null);
        setBadges(metaJson.data.badges);
        setRewards(metaJson.data.rewards);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load rewards");
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

  const earned = new Set(profile?.badges ?? []);
  const points = profile?.points ?? 0;

  const nextBadge = useMemo(() => {
    return (
      badges
        .filter((b) => !earned.has(b.id))
        .sort((a, b) => a.pointsRequired - b.pointsRequired)[0] ?? null
    );
  }, [badges, earned]);

  const progressToNext = nextBadge
    ? Math.min(100, Math.round((points / nextBadge.pointsRequired) * 100))
    : 100;

  function redeem(reward: Reward) {
    if (!reward.available) {
      toast.error("This reward is currently unavailable");
      return;
    }
    if (points < reward.pointsCost) {
      toast.error(`Need ${reward.pointsCost - points} more points`);
      return;
    }
    toast.success(`Redemption requested: ${reward.title}. AMC will confirm by SMS.`);
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[18px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Rewards unavailable" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AMC civic programme"
        title="Civic rewards"
        description="Earn points for verified reports across Ahmedabad wards. Redeem AMTS passes, Riverfront garden entry, and green-cover workshop seats."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Points balance"
          value={points}
          icon={Award}
          hint="Verified civic contributions"
          delay={0.05}
        />
        <KpiCard
          label="Badges earned"
          value={profile?.badges.length ?? 0}
          icon={Trophy}
          hint={`${badges.length} available citywide`}
          delay={0.1}
        />
        <KpiCard
          label="Reports filed"
          value={profile?.reportsCount ?? 0}
          icon={Target}
          hint={`${profile?.resolvedCount ?? 0} resolved`}
          delay={0.15}
        />
        <KpiCard
          label="Redeemables"
          value={rewards.filter((r) => r.available).length}
          icon={Gift}
          hint="Partner benefits live"
          delay={0.2}
        />
      </div>

      <div className="glass-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
              Progress tracker
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              {nextBadge
                ? `Next unlock · ${nextBadge.name}`
                : "All listed badges unlocked"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {nextBadge
                ? `${Math.max(0, nextBadge.pointsRequired - points)} points to go`
                : "Keep reporting monsoon and lighting gaps for bonus cycles."}
            </p>
          </div>
          <Badge tone="brand">{progressToNext}%</Badge>
        </div>
        <Progress value={progressToNext} className="mt-4" tone="brand" />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-[var(--brand)]">
          <Sparkles className="h-4 w-4" />
          <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
            Achievement cards
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {achievements.map((item, index) => {
            const current =
              item.metricKey === "points"
                ? points
                : item.metricKey === "reports"
                  ? (profile?.reportsCount ?? 0)
                  : (profile?.resolvedCount ?? 0);
            const pct = Math.min(100, Math.round((current / item.target) * 100));
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="glass-card p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Quest
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.blurb}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>
                    {current} / {item.target}
                  </span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="mt-2" tone="accent" />
              </motion.div>
            );
          })}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
              Recognition
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--foreground)]">
              Badges gallery
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
              Monsoon alerts, ward guardianship, and sustained reporting — unlock
              as you contribute across Ahmedabad.
            </p>
          </div>
          <p className="text-sm font-medium text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">
              {earned.size}
            </span>
            /{badges.length} earned
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {badges.map((badge, index) => {
            const unlocked = earned.has(badge.id);
            const Icon = resolveBadgeIcon(badge.icon);
            const progress = unlocked
              ? 100
              : Math.min(
                  99,
                  Math.round((points / Math.max(1, badge.pointsRequired)) * 100)
                );

            return (
              <motion.article
                key={badge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index, duration: 0.28 }}
                className={cn(
                  "relative overflow-hidden rounded-[22px] border p-5 transition",
                  unlocked
                    ? "border-teal-500/35 bg-gradient-to-br from-teal-500/15 via-[var(--surface-solid)] to-[var(--surface-solid)] shadow-[0_0_0_1px_rgba(43,181,174,0.12)]"
                    : "border-[var(--border)] bg-[var(--surface-solid)]"
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-2xl",
                      unlocked
                        ? "bg-[var(--brand)] text-white shadow-md shadow-teal-900/20"
                        : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold text-[var(--foreground)]">
                        {badge.name}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          unlocked
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200/90 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                        )}
                      >
                        {unlocked ? (
                          <>
                            <Check className="h-3 w-3" />
                            Earned
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            {badge.pointsRequired} pts
                          </>
                        )}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                      {badge.description}
                    </p>
                    {!unlocked ? (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[11px] text-[var(--muted)]">
                          <span>Progress</span>
                          <span className="tabular-nums">
                            {points}/{badge.pointsRequired}
                          </span>
                        </div>
                        <Progress value={progress} tone="brand" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <div className="glass-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Redeemable rewards</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Partner benefits from AMC civic participation programme.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {rewards.map((reward) => {
            const affordable = points >= reward.pointsCost;
            return (
              <div
                key={reward.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white/50 p-5 dark:bg-white/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{reward.title}</p>
                    <Badge tone={reward.available ? "brand" : "default"}>
                      {reward.available ? "Live" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{reward.description}</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--brand)]">
                    {reward.pointsCost} points
                  </p>
                </div>
                <Button
                  className="mt-4"
                  variant={affordable ? "default" : "outline"}
                  disabled={!reward.available}
                  onClick={() => redeem(reward)}
                >
                  {reward.available ? "Request redeem" : "Unavailable"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
