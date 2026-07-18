"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Badge as BadgeType, Reward, SessionUser, UserProfile } from "@/types";

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
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Rewards unavailable" description={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Civic rewards
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Earn points for verified reports across Ahmedabad wards. Redeem AMTS
          passes, Riverfront garden entry, and green-cover workshop seats.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Points balance" value={points} hint="Verified civic contributions" />
        <StatCard
          label="Badges earned"
          value={profile?.badges.length ?? 0}
          hint={`${badges.length} available citywide`}
        />
        <StatCard
          label="Reports filed"
          value={profile?.reportsCount ?? 0}
          hint={`${profile?.resolvedCount ?? 0} resolved`}
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>
            Recognition for monsoon alerts, ward guardianship, and sustained reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => {
            const unlocked = earned.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-4 ${
                  unlocked
                    ? "border-teal-200 bg-teal-50/70"
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg">{badge.icon}</p>
                    <p className="mt-1 font-semibold text-slate-900">{badge.name}</p>
                  </div>
                  <Badge tone={unlocked ? "success" : "default"}>
                    {unlocked ? "Earned" : `${badge.pointsRequired} pts`}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{badge.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Redeemable rewards</CardTitle>
          <CardDescription>
            Partner benefits from AMC civic participation programme.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white/80 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{reward.title}</p>
                <p className="mt-1 text-sm text-slate-600">{reward.description}</p>
                <p className="mt-3 text-sm font-medium text-teal-700">
                  {reward.pointsCost} points
                </p>
              </div>
              <Button
                className="mt-4"
                variant={points >= reward.pointsCost ? "default" : "outline"}
                disabled={!reward.available}
                onClick={() => redeem(reward)}
              >
                {reward.available ? "Request redeem" : "Unavailable"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
