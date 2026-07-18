"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  ClipboardList,
  MapPinned,
  Shield,
  Sparkles,
} from "lucide-react";
import { ReportTable } from "@/components/shared/report-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  InfrastructureReport,
  SessionUser,
  UserProfile,
} from "@/types";
import { sortByAiPriority } from "@/utils/ai-priority";
import { statusLabel } from "@/utils/status";

export default function AdminProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [meRes, reportsRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);

        const meJson = (await meRes.json()) as {
          success: boolean;
          message?: string;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };

        if (!meRes.ok || !meJson.success || !meJson.data) {
          throw new Error(meJson.message || "Unable to load profile");
        }
        if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
          throw new Error(reportsJson.message || "Unable to load desk queue");
        }

        if (!active) return;
        setUser(meJson.data.user);
        setProfile(meJson.data.profile ?? null);
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

  const openStatuses = useMemo(
    () => new Set(["submitted", "acknowledged", "assigned", "in_progress"]),
    []
  );

  const openCount = reports.filter((r) => openStatuses.has(r.status)).length;
  const criticalCount = reports.filter((r) => r.priority === "critical").length;
  const topQueue = sortByAiPriority(
    reports.filter((r) => openStatuses.has(r.status))
  ).slice(0, 5);

  const managedWards =
    user?.managedWards?.length
      ? user.managedWards
      : user?.ward
        ? [user.ward]
        : [];
  const scopeLabel =
    user?.adminScope === "city" ? "City HQ · all wards" : "Ward desk";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <EmptyState
        title="Profile unavailable"
        description={error ?? "Sign in again to view your AMC desk profile."}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]">
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 px-5 py-6 text-white sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100/90">
            Officer profile
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-white/30">
              <Image
                src={
                  profile?.avatarUrl ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop"
                }
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {user.name}
              </h1>
              <p className="mt-1 truncate text-sm text-teal-100/90">
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand" className="normal-case">
                  {user.role}
                </Badge>
                <Badge tone="info" className="normal-case">
                  {scopeLabel}
                </Badge>
                {managedWards.map((w) => (
                  <Badge key={w} tone="default" className="normal-case">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/reports">
                <Button
                  size="sm"
                  className="rounded-xl bg-white text-slate-900 hover:bg-teal-50"
                >
                  Open inbox
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <Meta
            icon={Shield}
            label="Desk scope"
            value={user.adminScope === "city" ? "City HQ" : "Ward desk"}
          />
          <Meta
            icon={MapPinned}
            label="Primary ward"
            value={user.ward || "—"}
          />
          <Meta
            icon={Building2}
            label="Managed wards"
            value={
              user.adminScope === "city"
                ? "All Ahmedabad"
                : managedWards.join(", ") || "—"
            }
          />
          <Meta
            icon={ClipboardList}
            label="Phone"
            value={profile?.phone || "Not on file"}
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Desk queue" value={reports.length} hint="Tickets in your scope" />
        <Stat label="Open" value={openCount} hint="Needs action" />
        <Stat label="Critical" value={criticalCount} hint="Escalate first" danger />
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--brand)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Your AI priority preview
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Top open tickets in your desk scope, ranked by triage score
            </p>
          </div>
          <Link
            href="/admin/priority"
            className="text-xs font-semibold text-[var(--brand)] hover:underline"
          >
            Full queue
          </Link>
        </div>

        {topQueue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No open tickets in your desk right now.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {topQueue.map((report, i) => (
              <li key={report.id}>
                <Link
                  href={`/admin/reports/${report.id}`}
                  className="flex items-start gap-3 px-3 py-3 transition hover:bg-[var(--brand-soft)]/40 sm:items-center"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {report.title}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {report.ward} · {statusLabel(report.status)} ·{" "}
                      {report.priority}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reports.length > 0 ? (
        <ReportTable
          reports={sortByAiPriority(reports).slice(0, 8)}
          hrefBase="/admin/reports"
          showAiScore
          dense
        />
      ) : null}
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: number;
  hint: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        danger
          ? "border-rose-300/40 bg-rose-500/10"
          : "border-[var(--border)] bg-[var(--surface-solid)]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          danger ? "text-rose-700 dark:text-rose-100" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}
