"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ReportTable } from "@/components/shared/report-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Department,
  InfrastructureReport,
  Priority,
  ReportStatus,
  Ward,
} from "@/types";
import { statusLabel } from "@/utils/status";

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
  "flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-60";

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
  const [deskScope, setDeskScope] = useState<
    { type: "city" } | { type: "ward"; wards: string[] } | null
  >(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (ward) params.set("ward", ward);
    if (departmentId) params.set("departmentId", departmentId);
    return params.toString();
  }, [q, status, priority, ward, departmentId]);

  useEffect(() => {
    void (async () => {
      const metaRes = await fetch("/api/meta", { cache: "no-store" });
      const metaJson = (await metaRes.json()) as {
        success: boolean;
        data?: { wards: Ward[]; departments: Department[] };
      };
      if (metaRes.ok && metaJson.success && metaJson.data) {
        setWards(metaJson.data.wards);
        setDepartments(metaJson.data.departments);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
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
        if (active) {
          setReports(json.data.reports);
          if (json.data.scope) setDeskScope(json.data.scope);
        }
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
  }, [queryString]);

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

  const wardLocked = deskScope?.type === "ward" ? deskScope.wards : null;
  const openCount = reports.filter(
    (r) => !["resolved", "rejected"].includes(r.status)
  ).length;
  const criticalCount = reports.filter((r) => r.priority === "critical").length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-solid)] p-6 shadow-[var(--shadow)] sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,var(--brand-soft),transparent_42%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
              <FileText className="h-3.5 w-3.5" />
              {wardLocked ? "Ward desk inbox" : "AMC HQ inbox"}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              {wardLocked
                ? `${wardLocked.join(" / ")} ward inbox`
                : "City-wide reports inbox"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              {wardLocked
                ? "Citizens may live in any ward and file tickets for this ward — you only receive requests mapped to your desk."
                : "HQ view across all Ahmedabad wards. Ward desks see only their own inbox."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]">
              {reports.length} shown
            </span>
            <span className="rounded-full border border-rose-200/70 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {criticalCount} critical
            </span>
            <span className="rounded-full border border-[var(--brand)]/25 bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-strong)] dark:text-teal-100">
              {openCount} open
            </span>
          </div>
        </div>
      </section>

      {wardLocked ? (
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 text-sm text-teal-900 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100">
          Ward desk scope: <strong>{wardLocked.join(", ")}</strong> — tickets from
          other wards are hidden.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-[var(--foreground)]">
          <Filter className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="font-display text-lg font-semibold">Filters</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, address, ward, ticket id…"
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className={fieldClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus | "")}
            >
              {statuses.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? statusLabel(s) : "All statuses"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className={fieldClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | "")}
            >
              {priorities.map((p) => (
                <option key={p || "all"} value={p}>
                  {p || "All priorities"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ward">Ward</Label>
            <select
              id="ward"
              className={fieldClass}
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept">Department</Label>
            <select
              id="dept"
              className={fieldClass}
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
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQ("");
              setStatus("");
              setPriority("");
              setWard("");
              setDepartmentId("");
            }}
          >
            Clear filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ((v) => v);
              void fetch(`/api/reports${queryString ? `?${queryString}` : ""}`, {
                cache: "no-store",
              })
                .then((r) => r.json())
                .then((json: { success?: boolean; data?: { reports: InfrastructureReport[] } }) => {
                  if (json.success && json.data) setReports(json.data.reports);
                });
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {error ? <EmptyState title="Unable to load reports" description={error} /> : null}

      {!loading && !error && reports.length === 0 ? (
        <EmptyState
          title="No reports match"
          description="Adjust filters or clear them to see the full AMC inbox."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQ("");
                setStatus("");
                setPriority("");
                setWard("");
                setDepartmentId("");
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : null}

      {!loading && !error && reports.length > 0 ? (
        <ReportTable
          reports={reports}
          hrefBase="/admin/reports"
          adminActions
          updatingId={updatingId}
          onStatusChange={(id, next) => void updateStatus(id, next)}
        />
      ) : null}
    </div>
  );
}
