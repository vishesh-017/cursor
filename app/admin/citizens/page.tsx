"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, LeaderboardEntry } from "@/types";

export default function AdminCitizensPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [metaRes, reportsRes] = await Promise.all([
          fetch("/api/meta", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);

        const metaJson = (await metaRes.json()) as {
          success: boolean;
          message?: string;
          data?: { leaderboard: LeaderboardEntry[] };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };

        if (!metaRes.ok || !metaJson.success || !metaJson.data) {
          throw new Error(metaJson.message || "Unable to load citizens");
        }
        if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
          throw new Error(reportsJson.message || "Unable to load reports");
        }

        if (!active) return;
        setLeaderboard(metaJson.data.leaderboard);
        setReports(reportsJson.data.reports);
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

  const citizens = useMemo(() => {
    const fromReports = new Map<string, { id: string; name: string; ward: string; reports: number }>();
    for (const report of reports) {
      const existing = fromReports.get(report.citizenId);
      if (existing) {
        existing.reports += 1;
      } else {
        fromReports.set(report.citizenId, {
          id: report.citizenId,
          name: report.citizenName,
          ward: report.ward,
          reports: 1,
        });
      }
    }

    const merged = leaderboard.map((entry) => {
      const live = fromReports.get(entry.userId);
      return {
        id: entry.userId,
        name: entry.name,
        ward: entry.ward,
        points: entry.points,
        reports: live?.reports ?? entry.reports,
        badges: entry.badges,
        rank: entry.rank,
      };
    });

    for (const [id, live] of fromReports) {
      if (!merged.some((c) => c.id === id)) {
        merged.push({
          id,
          name: live.name,
          ward: live.ward,
          points: 0,
          reports: live.reports,
          badges: 0,
          rank: 99,
        });
      }
    }

    const q = query.trim().toLowerCase();
    return merged
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.ward.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      )
      .sort((a, b) => b.points - a.points || b.reports - a.reports);
  }, [leaderboard, reports, query]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Citizens unavailable" description={error} />;
  }

  const totalReports = citizens.reduce((sum, c) => sum + c.reports, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Citizens
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Active civic reporters contributing infrastructure intelligence across
          Ahmedabad wards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Citizens listed" value={citizens.length} />
        <StatCard label="Reports attributed" value={totalReports} />
        <StatCard
          label="Top contributor"
          value={citizens[0]?.name ?? "—"}
          hint={citizens[0] ? `${citizens[0].points} pts` : undefined}
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Search citizens</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ward, or user id…"
          />
        </CardContent>
      </Card>

      {citizens.length === 0 ? (
        <EmptyState
          title="No citizens match"
          description="Try a different search term."
        />
      ) : (
        <Card className="glass-card overflow-hidden">
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Citizen</th>
                  <th className="px-4 py-3">Ward</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Badges</th>
                  <th className="px-4 py-3">Rank</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((citizen) => (
                  <tr key={citizen.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{citizen.name}</p>
                      <p className="text-xs text-slate-500">{citizen.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{citizen.ward}</td>
                    <td className="px-4 py-3 font-semibold text-teal-800">
                      {citizen.points}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{citizen.reports}</td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">{citizen.badges}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {citizen.rank < 99 ? `#${citizen.rank}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
