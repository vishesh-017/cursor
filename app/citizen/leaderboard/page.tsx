"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, MapPinned, Search, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DepartmentRankingEntry,
  LeaderboardEntry,
  SessionUser,
  WardRankingEntry,
} from "@/types";
import { cn } from "@/utils/cn";

type Tab = "citizens" | "wards" | "departments";

export default function CitizenLeaderboardPage() {
  const [tab, setTab] = useState<Tab>("citizens");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentRankingEntry[]>([]);
  const [wardRanks, setWardRanks] = useState<WardRankingEntry[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
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
          data?: {
            leaderboard: LeaderboardEntry[];
            departmentLeaderboard: DepartmentRankingEntry[];
            wardLeaderboard: WardRankingEntry[];
          };
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
        setDepartments(metaJson.data.departmentLeaderboard ?? []);
        setWardRanks(metaJson.data.wardLeaderboard ?? []);
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

  const wards = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.ward))).sort();
  }, [entries]);

  const filteredCitizens = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesWard = wardFilter === "all" || entry.ward === wardFilter;
      const matchesQuery =
        !q ||
        entry.name.toLowerCase().includes(q) ||
        entry.ward.toLowerCase().includes(q);
      return matchesWard && matchesQuery;
    });
  }, [entries, query, wardFilter]);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return departments.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.head.toLowerCase().includes(q) ||
        d.departmentId.includes(q)
    );
  }, [departments, query]);

  const filteredWards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wardRanks.filter(
      (w) =>
        !q ||
        w.ward.toLowerCase().includes(q) ||
        w.zone.toLowerCase().includes(q)
    );
  }, [wardRanks, query]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-64 w-full rounded-[18px]" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Leaderboard unavailable" description={error} />;
  }

  const top3 = filteredCitizens.slice(0, 3);
  const rest = filteredCitizens.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(
    Boolean
  ) as LeaderboardEntry[];
  const heights = ["h-36", "h-44", "h-32"];
  const deptTop = filteredDepartments[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Civic rankings"
        title="Ahmedabad civic leaderboard"
        description="Compare citizen contributors, ward performance, and AMC department response rankings across the city."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["citizens", "Citizen ranking"],
            ["wards", "Ward ranking"],
            ["departments", "Department ranking"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setQuery("");
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
              tab === id
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--brand)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "citizens" ? (
        <>
          <div className="glass-card overflow-hidden p-5 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-[var(--brand)]">
              <Trophy className="h-5 w-5" />
              <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
                Top contributors
              </h2>
            </div>
            {top3.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No rankings match your filters.</p>
            ) : (
              <div className="grid items-end gap-4 sm:grid-cols-3">
                {podiumOrder.map((entry, index) => {
                  const visualRank = entry.rank;
                  const height = heights[index] ?? "h-32";
                  const isMe = entry.userId === meId;
                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.35 }}
                      className={`flex flex-col items-center ${index === 1 ? "sm:-mt-4" : ""}`}
                    >
                      <div className="mb-3 text-center">
                        <p className="font-display text-lg font-semibold">{entry.name}</p>
                        <p className="text-xs text-[var(--muted)]">{entry.ward}</p>
                        {isMe ? (
                          <Badge className="mt-1" tone="brand">
                            You
                          </Badge>
                        ) : null}
                      </div>
                      <div
                        className={`flex w-full max-w-[180px] ${height} flex-col items-center justify-end rounded-t-[22px] border border-[var(--border)] bg-gradient-to-t from-[var(--brand-soft)] to-white/70 px-3 pb-4 dark:to-white/5`}
                      >
                        <p className="font-display text-3xl font-semibold text-[var(--brand)]">
                          #{visualRank}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{entry.points} pts</p>
                        <p className="text-xs text-[var(--muted)]">
                          {entry.reports} reports · {entry.badges} badges
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search citizen or ward…"
                  className="pl-9"
                />
              </div>
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm"
              >
                <option value="all">All wards</option>
                {wards.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/50 text-xs uppercase tracking-wide text-[var(--muted)] dark:bg-white/5">
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
                  {rest.map((entry) => {
                    const isMe = entry.userId === meId;
                    return (
                      <tr
                        key={entry.userId}
                        className={`border-t border-[var(--border)] ${
                          isMe
                            ? "bg-[var(--brand-soft)]"
                            : "hover:bg-white/40 dark:hover:bg-white/5"
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold">#{entry.rank}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{entry.name}</span>
                          {isMe ? (
                            <Badge className="ml-2" tone="brand">
                              You
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">{entry.ward}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--brand)]">
                          {entry.points}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">{entry.reports}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{entry.badges}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {tab === "wards" ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ward or zone…"
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filteredWards.map((ward) => (
              <div key={ward.ward} className="glass-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[var(--brand)]">
                    <MapPinned className="h-4 w-4" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {ward.ward}
                    </p>
                  </div>
                  <Badge tone="brand">#{ward.rank}</Badge>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold">{ward.score}</p>
                <p className="text-xs text-[var(--muted)]">
                  {ward.zone} zone · health {ward.healthScore} · {ward.openIssues} open
                </p>
                <p className="mt-2 text-xs font-medium text-[var(--brand)]">
                  {ward.citizenPoints} citizen points
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "departments" ? (
        <div className="space-y-4">
          {deptTop ? (
            <div className="glass-card relative overflow-hidden p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(13,110,106,0.16),transparent_40%)]" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                    Leading AMC department
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold">
                    {deptTop.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Head: {deptTop.head}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-center dark:bg-white/5">
                  <p className="text-xs text-[var(--muted)]">Dept score</p>
                  <p className="font-display text-3xl font-semibold text-[var(--brand)]">
                    {deptTop.score}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search department or head…"
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/[0.03] text-xs uppercase tracking-[0.14em] text-[var(--muted)] dark:bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3.5">Rank</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Head</th>
                  <th className="px-4 py-3.5">Score</th>
                  <th className="px-4 py-3.5">Efficiency</th>
                  <th className="px-4 py-3.5">Open</th>
                  <th className="px-4 py-3.5">Resolved</th>
                  <th className="px-4 py-3.5">Avg hrs</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr
                    key={dept.departmentId}
                    className="border-t border-[var(--border)] hover:bg-[var(--brand-soft)]/40"
                  >
                    <td className="px-4 py-3.5 font-semibold">#{dept.rank}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[var(--brand)]" />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{dept.head}</td>
                    <td className="px-4 py-3.5 font-semibold text-[var(--brand)]">
                      {dept.score}
                    </td>
                    <td className="px-4 py-3.5">{dept.efficiency}%</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{dept.openIssues}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {dept.resolvedIssues}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {dept.avgResolutionHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
