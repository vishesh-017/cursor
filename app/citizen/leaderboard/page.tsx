"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardEntry, SessionUser } from "@/types";

export default function CitizenLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [metaRes, meRes] = await Promise.all([
          fetch("/api/meta", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);

        const metaJson = (await metaRes.json()) as {
          success: boolean;
          message?: string;
          data?: { leaderboard: LeaderboardEntry[] };
        };
        const meJson = (await meRes.json()) as {
          success: boolean;
          data?: { user: SessionUser };
        };

        if (!metaRes.ok || !metaJson.success || !metaJson.data) {
          throw new Error(metaJson.message || "Unable to load leaderboard");
        }

        if (!active) return;
        setEntries(metaJson.data.leaderboard);
        setMeId(meJson.data?.user.id ?? null);
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
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Leaderboard unavailable" description={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Ahmedabad civic leaderboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Top citizen contributors helping AMC spot and close infrastructure gaps
          across Thaltej, Maninagar, Satellite, and beyond.
        </p>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle>City rankings</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Citizen</th>
                <th className="px-4 py-3">Ward</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3">Badges</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isMe = entry.userId === meId;
                return (
                  <tr
                    key={entry.userId}
                    className={`border-t border-slate-100 ${
                      isMe ? "bg-teal-50/80" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      #{entry.rank}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{entry.name}</span>
                      {isMe ? (
                        <Badge className="ml-2" tone="brand">
                          You
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{entry.ward}</td>
                    <td className="px-4 py-3 font-semibold text-teal-800">
                      {entry.points}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{entry.reports}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.badges}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
