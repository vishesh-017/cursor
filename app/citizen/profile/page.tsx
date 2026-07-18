"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionUser, UserProfile } from "@/types";

export default function CitizenProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Unable to load profile");
        }
        if (!active) return;
        setUser(json.data.user);
        setProfile(json.data.profile ?? null);
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
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
      <Card className="glass-card">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <Image
            src={profile.avatarUrl}
            alt={profile.name}
            width={88}
            height={88}
            className="rounded-full object-cover"
          />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {profile.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
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
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Civic points" value={profile.points} />
        <StatCard label="Reports filed" value={profile.reportsCount} />
        <StatCard label="Resolved" value={profile.resolvedCount} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Session name</p>
            <p className="font-medium text-slate-900">{user.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Home ward</p>
            <p className="font-medium text-slate-900">{user.ward}</p>
          </div>
          <div>
            <p className="text-slate-500">Citizen ID</p>
            <p className="font-medium text-slate-900">{user.id}</p>
          </div>
          <div>
            <p className="text-slate-500">Badges unlocked</p>
            <p className="font-medium text-slate-900">{profile.badges.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
