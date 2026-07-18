"use client";

import { useEffect, useMemo, useState } from "react";
import { ModerateCitizen } from "@/components/admin/moderate-citizen";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountStatus, UserProfile } from "@/types";

type CitizenRow = UserProfile & {
  liveReports: number;
  aiFakeReports: number;
};

const statusTone = (
  status: AccountStatus
): "success" | "warning" | "danger" | "default" => {
  if (status === "active") return "success";
  if (status === "flagged") return "warning";
  if (status === "suspended" || status === "removed") return "danger";
  return "default";
};

export default function AdminCitizensPage() {
  const [citizens, setCitizens] = useState<CitizenRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { citizens: CitizenRow[] };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Unable to load citizens");
      }
      setCitizens(json.data.citizens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return citizens
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.ward.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.accountStatus ?? "active").includes(q)
      )
      .sort((a, b) => {
        const statusRank = (s: AccountStatus) =>
          s === "removed" ? 0 : s === "suspended" ? 1 : s === "flagged" ? 2 : 3;
        const sa = statusRank(a.accountStatus ?? "active");
        const sb = statusRank(b.accountStatus ?? "active");
        if (sa !== sb) return sa - sb;
        return (
          (b.aiFakeReports ?? 0) - (a.aiFakeReports ?? 0) ||
          b.points - a.points ||
          b.liveReports - a.liveReports
        );
      });
  }, [citizens, query]);

  const flaggedCount = citizens.filter(
    (c) => (c.accountStatus ?? "active") !== "active"
  ).length;
  const fakeSignalCount = citizens.reduce(
    (sum, c) => sum + (c.aiFakeReports ?? 0),
    0
  );

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

  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Citizens
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Review reporters, flag fake submissions, and suspend or remove abusive
          accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Citizens listed" value={citizens.length} />
        <StatCard
          label="Moderated accounts"
          value={flaggedCount}
          hint="Flagged, suspended, or removed"
        />
        <StatCard
          label="AI fake signals"
          value={fakeSignalCount}
          hint="Reports marked possibly fake"
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
            placeholder="Search by name, ward, status, or user id…"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {filtered.length === 0 ? (
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
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reports</th>
                    <th className="px-4 py-3">AI fake</th>
                    <th className="px-4 py-3">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((citizen) => {
                    const status = citizen.accountStatus ?? "active";
                    const active = selectedId === citizen.id;
                    return (
                      <tr
                        key={citizen.id}
                        className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 ${
                          active ? "bg-teal-50/70" : ""
                        }`}
                        onClick={() => setSelectedId(citizen.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--foreground)]">
                            {citizen.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {citizen.ward} · {citizen.id}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(status)}>{status}</Badge>
                          {(citizen.flagCount ?? 0) > 0 ? (
                            <p className="mt-1 text-[10px] text-amber-700">
                              {citizen.flagCount} flags
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {citizen.liveReports}
                        </td>
                        <td className="px-4 py-3">
                          {citizen.aiFakeReports > 0 ? (
                            <Badge tone="warning">{citizen.aiFakeReports}</Badge>
                          ) : (
                            <span className="text-[var(--muted)]">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-teal-800">
                          {citizen.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle>Report / remove user</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-[var(--muted)]">
                Select a citizen to flag for fake reports, suspend login, or
                remove their account.
              </p>
            ) : (
              <ModerateCitizen
                key={selected.id}
                citizenId={selected.id}
                citizenName={selected.name}
                accountStatus={selected.accountStatus ?? "active"}
                flagCount={selected.flagCount ?? 0}
                moderationNote={selected.moderationNote}
                onModerated={(user) => {
                  setCitizens((prev) =>
                    prev.map((c) =>
                      c.id === user.id
                        ? {
                            ...c,
                            ...user,
                            liveReports: c.liveReports,
                            aiFakeReports: c.aiFakeReports,
                          }
                        : c
                    )
                  );
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
