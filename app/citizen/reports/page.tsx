"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, PlusCircle, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ReportTable } from "@/components/shared/report-table";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, Priority, ReportStatus, SessionUser } from "@/types";

type StatusFilter = "all" | ReportStatus;
type PriorityFilter = "all" | Priority;

const statusChips: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

const priorityChips: Array<{ id: PriorityFilter; label: string }> = [
  { id: "all", label: "Any severity" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export default function CitizenReportsPage() {
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [view, setView] = useState<"cards" | "table">("cards");
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
          data?: { user: SessionUser };
          message?: string;
        };
        if (!meRes.ok || !meJson.success || !meJson.data) {
          throw new Error(meJson.message || "Sign in required");
        }

        const params = new URLSearchParams({
          citizenId: meJson.data.user.id,
        });
        if (query.trim()) params.set("q", query.trim());

        const res = await fetch(`/api/reports?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
          message?: string;
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Failed to load reports");
        }
        if (active) setReports(json.data.reports);
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
  }, [query]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const statusOk = statusFilter === "all" || r.status === statusFilter;
      const priorityOk = priorityFilter === "all" || r.priority === priorityFilter;
      return statusOk && priorityOk;
    });
  }, [reports, statusFilter, priorityFilter]);

  const openCount = reports.filter(
    (r) => r.status !== "resolved" && r.status !== "rejected"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen tickets"
        title="My reports"
        description="Every infrastructure ticket you filed with AMC — from CG Road lighting to Vastrapur water pressure and Maninagar drainage."
        actions={
          <Link href="/citizen/reports/new">
            <Button className="rounded-2xl">
              <PlusCircle className="h-4 w-4" />
              New report
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Total</p>
          <p className="mt-1 font-display text-3xl font-semibold">{reports.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Open</p>
          <p className="mt-1 font-display text-3xl font-semibold">{openCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            Showing
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{filtered.length}</p>
        </div>
      </div>

      <div className="glass-card space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, ward, or landmark…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--muted)]" />
            <Button
              size="sm"
              variant={view === "cards" ? "default" : "outline"}
              onClick={() => setView("cards")}
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
            >
              Table
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === chip.id
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--brand)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {priorityChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setPriorityFilter(chip.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                priorityFilter === chip.id
                  ? "border-[var(--accent)] bg-orange-50 text-[var(--accent)] dark:bg-orange-500/10"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[18px]" />
          ))}
        </div>
      ) : null}

      {error ? (
        <EmptyState title="Unable to load reports" description={error} />
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState
          title="No matching reports"
          description="Try a different filter, or submit a new civic issue from your ward."
          action={
            <Link href="/citizen/reports/new">
              <Button>Report an issue</Button>
            </Link>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 && view === "table" ? (
        <ReportTable reports={filtered} hrefBase="/citizen/reports" />
      ) : null}

      {!loading && !error && filtered.length > 0 && view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((report) => (
            <Link
              key={report.id}
              href={`/citizen/reports/${report.id}`}
              className="glass-card block p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    {report.id}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold">
                    {report.title}
                  </h2>
                </div>
                <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                {report.address} · {report.ward}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(report.status)}>
                  {report.status.replace("_", " ")}
                </Badge>
                <Badge tone="default">{report.category}</Badge>
                <span className="ml-auto text-xs text-[var(--muted)]">
                  {new Date(report.updatedAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
