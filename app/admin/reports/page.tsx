"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ReportTable } from "@/components/shared/report-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivePoll } from "@/hooks/use-live-poll";
import { cn } from "@/utils/cn";
import type {
  Department,
  InfrastructureReport,
  Priority,
  ReportStatus,
  Ward,
} from "@/types";
import { sortByAiPriority } from "@/utils/ai-priority";
import { statusLabel } from "@/utils/status";

type SortMode = "ai" | "recent" | "severity";

const statuses: Array<ReportStatus | ""> = [
  "",
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
];

const priorities: Array<Priority | ""> = ["", "low", "medium", "high", "critical"];

const fieldClass =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-60";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [ward, setWard] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("ai");
  const [deskScope, setDeskScope] = useState<
    { type: "city" } | { type: "ward"; wards: string[] } | null
  >(null);
  const [liveSync, setLiveSync] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (ward) params.set("ward", ward);
    if (departmentId) params.set("departmentId", departmentId);
    return params.toString();
  }, [q, status, priority, ward, departmentId]);

  const filtersActive = Boolean(
    q.trim() || status || priority || ward || departmentId
  );

  useEffect(() => {
    void (async () => {
      const metaRes = await fetch("/api/meta", { cache: "no-store" });
      const metaJson = (await metaRes.json()) as {
        success: boolean;
        data?: {
          wards: Ward[];
          departments: Department[];
          storage?: { synced?: boolean };
        };
      };
      if (metaRes.ok && metaJson.success && metaJson.data) {
        setWards(metaJson.data.wards);
        setDepartments(metaJson.data.departments);
        setLiveSync(Boolean(metaJson.data.storage?.synced));
      }
    })();
  }, []);

  const loadReports = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(
          `/api/reports${queryString ? `?${queryString}` : ""}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: {
            reports: InfrastructureReport[];
            scope?: { type: "city" } | { type: "ward"; wards: string[] };
          };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Failed to load reports");
        }
        setReports(json.data.reports);
        if (json.data.scope) setDeskScope(json.data.scope);
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useLivePoll(() => loadReports({ silent: true }), {
    intervalMs: 8000,
    enabled: liveSync,
  });

  async function updateStatus(id: string, nextStatus: ReportStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          timelineNote: `Status set to ${statusLabel(nextStatus)}`,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { report: InfrastructureReport };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Status update failed");
      }
      setReports((prev) =>
        prev.map((r) => (r.id === id ? json.data!.report : r))
      );
      toast.success(`Marked ${statusLabel(nextStatus)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  function clearFilters() {
    setQ("");
    setStatus("");
    setPriority("");
    setWard("");
    setDepartmentId("");
    setSortMode("ai");
  }

  async function refresh() {
    const res = await fetch(
      `/api/reports${queryString ? `?${queryString}` : ""}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: { reports: InfrastructureReport[] };
    };
    if (json.success && json.data) setReports(json.data.reports);
  }

  const wardLocked = deskScope?.type === "ward" ? deskScope.wards : null;
  const openCount = reports.filter(
    (r) => !["resolved", "rejected"].includes(r.status)
  ).length;
  const criticalCount = reports.filter((r) => r.priority === "critical").length;

  const sortedReports = useMemo(() => {
    if (sortMode === "ai") return sortByAiPriority(reports);
    if (sortMode === "severity") {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      return [...reports].sort((a, b) => {
        const d = rank[a.priority] - rank[b.priority];
        if (d !== 0) return d;
        return +new Date(b.updatedAt) - +new Date(a.updatedAt);
      });
    }
    return [...reports].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
    );
  }, [reports, sortMode]);

  return (
    <div className="space-y-4">
      {/* Compact toolbar — title + KPIs in one row */}
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-[var(--brand)]" />
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
              {wardLocked
                ? `${wardLocked.join(" / ")} ward inbox`
                : "City-wide reports inbox"}
            </h1>
            <span className="rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-strong)]">
              {wardLocked ? "Ward desk" : "AMC HQ"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {wardLocked
              ? `Scoped to ${wardLocked.join(", ")} — other wards hidden`
              : "All Ahmedabad wards · ranked for dispatch"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatChip
            label="shown"
            value={reports.length}
            tone="neutral"
          />
          <StatChip
            label="critical"
            value={criticalCount}
            tone="danger"
          />
          <StatChip
            label="open"
            value={openCount}
            tone="brand"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => void refresh()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Single filter bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-3 sm:p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, address, ward, ticket…"
              aria-label="Search reports"
              className={cn(fieldClass, "pl-9 pr-3")}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
            <select
              aria-label="Status"
              className={cn(fieldClass, "lg:w-[9.5rem]")}
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus | "")}
            >
              {statuses.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? statusLabel(s) : "All statuses"}
                </option>
              ))}
            </select>
            <select
              aria-label="Priority"
              className={cn(fieldClass, "lg:w-[9rem]")}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | "")}
            >
              {priorities.map((p) => (
                <option key={p || "all"} value={p}>
                  {p || "All priorities"}
                </option>
              ))}
            </select>
            <select
              aria-label="Ward"
              className={cn(fieldClass, "lg:w-[9rem]")}
              value={wardLocked ? wardLocked[0] : ward}
              disabled={Boolean(wardLocked)}
              onChange={(e) => setWard(e.target.value)}
            >
              {wardLocked ? (
                wardLocked.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              ) : (
                <>
                  <option value="">All wards</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <select
              aria-label="Department"
              className={cn(fieldClass, "lg:w-[10rem]")}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort order"
              className={cn(
                fieldClass,
                "col-span-2 font-semibold sm:col-span-1 lg:w-[11rem]",
                sortMode === "ai" && "border-[var(--brand)]/40 text-[var(--brand)]"
              )}
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="ai">AI priority</option>
              <option value="severity">Severity</option>
              <option value="recent">Most recent</option>
            </select>
          </div>

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 shrink-0 rounded-xl"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>

        {sortMode === "ai" ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <Sparkles className="h-3 w-3 text-[var(--brand)]" />
            Ranked by Exa triage — priority score, authenticity, and photo relevance.
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4">
          <Skeleton className="h-9 w-1/4" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}

      {error ? <EmptyState title="Unable to load reports" description={error} /> : null}

      {!loading && !error && reports.length === 0 ? (
        <EmptyState
          title="No reports match"
          description="Adjust filters or clear them to see the full AMC inbox."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Reset filters
            </Button>
          }
        />
      ) : null}

      {!loading && !error && sortedReports.length > 0 ? (
        <ReportTable
          reports={sortedReports}
          hrefBase="/admin/reports"
          adminActions
          showAiScore={sortMode === "ai"}
          dense
          updatingId={updatingId}
          onStatusChange={(id, next) => void updateStatus(id, next)}
        />
      ) : null}
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "danger" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-xl border px-2.5 py-1.5",
        tone === "danger" &&
          "border-rose-200/80 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10",
        tone === "brand" &&
          "border-[var(--brand)]/25 bg-[var(--brand-soft)]",
        tone === "neutral" &&
          "border-[var(--border)] bg-[var(--surface)]"
      )}
    >
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          tone === "danger" && "text-rose-700 dark:text-rose-200",
          tone === "brand" && "text-[var(--brand-strong)] dark:text-teal-100",
          tone === "neutral" && "text-[var(--foreground)]"
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          tone === "danger" && "text-rose-600/80 dark:text-rose-300/80",
          tone === "brand" && "text-[var(--brand)]/80",
          tone === "neutral" && "text-[var(--muted)]"
        )}
      >
        {label}
      </span>
    </span>
  );
}
