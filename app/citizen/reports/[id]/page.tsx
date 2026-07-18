"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock3,
  MessageSquare,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { AiVsActualPanel } from "@/components/report/ai-vs-actual";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, ReportStatus } from "@/types";
import { statusLabel } from "@/utils/status";

type NearbyReport = InfrastructureReport & { distanceKm: number };

const STATUS_STEPS: ReportStatus[] = [
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
];

const ROAD_HERO =
  "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=1600&q=80";

type MockComment = {
  id: string;
  author: string;
  role: string;
  at: string;
  body: string;
};

function buildComments(report: InfrastructureReport): MockComment[] {
  return [
    {
      id: "c1",
      author: "Ravi Patel",
      role: "Neighbour · " + report.ward,
      at: report.createdAt,
      body: `Confirmed this near ${report.address}. Evening traffic from CG Road / BRTS side makes the stretch risky for two-wheelers.`,
    },
    {
      id: "c2",
      author: "AMC Field Desk",
      role: "Municipal note",
      at: report.updatedAt,
      body:
        report.status === "resolved"
          ? "Crew closure verified. Citizens may re-open if monsoon runoff returns within 72 hours."
          : "Ticket routed to ward inspector. Expect site visit during morning peak hours.",
    },
    {
      id: "c3",
      author: "Meera Desai",
      role: "Civic volunteer",
      at: report.updatedAt,
      body: "Similar ponding reported last monsoon near Law Garden underpass — sharing photo timestamps with the ward office.",
    },
  ];
}

export default function CitizenReportDetailPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<InfrastructureReport | null>(null);
  const [nearby, setNearby] = useState<NearbyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/${params.id}`, { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: { report: InfrastructureReport; nearby: NearbyReport[] };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Report not found");
        }
        if (!active) return;
        setReport(json.data.report);
        setNearby(json.data.nearby);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  const comments = useMemo(
    () => (report ? buildComments(report) : []),
    [report]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[18px]" />
        <Skeleton className="h-56 w-full rounded-[18px]" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <EmptyState
        title="Report unavailable"
        description={error ?? "This ticket could not be loaded."}
        action={
          <Link href="/citizen/reports">
            <Button variant="outline">Back to my reports</Button>
          </Link>
        }
      />
    );
  }

  const stepIndex = STATUS_STEPS.indexOf(
    report.status === "rejected" ? "submitted" : report.status
  );
  const statusProgress = Math.max(
    8,
    Math.round(((Math.max(stepIndex, 0) + 1) / STATUS_STEPS.length) * 100)
  );
  const heroSrc = report.imageUrl || ROAD_HERO;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] shadow-[var(--shadow)]">
        <div className="absolute inset-0">
          <Image
            src={heroSrc}
            alt={`Site context for ${report.title}`}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/25" />
        </div>
        <div className="relative space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              Ticket {report.id}
            </p>
            <Link href="/citizen/reports">
              <Button
                variant="outline"
                className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                All reports
              </Button>
            </Link>
          </div>
          <h1 className="max-w-3xl font-display text-3xl font-semibold text-white sm:text-4xl">
            {report.title}
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            {report.address} · {report.ward} ward · {report.category}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
            <Badge tone={statusTone(report.status)}>
              {statusLabel(report.status)}
            </Badge>
            <Badge tone="brand">{report.departmentId.replace("-", " ")}</Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Resolution progress</span>
            <span className="font-semibold tabular-nums">{statusProgress}%</span>
          </div>
          <Progress value={statusProgress} className="mt-2" tone="brand" />
          <p className="mt-2 text-xs text-[var(--muted)]">
            Based on AMC status updates for this ticket
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Civic points</span>
            <span className="font-semibold tabular-nums">{report.pointsAwarded}</span>
          </div>
          <Progress
            value={Math.min(100, report.pointsAwarded)}
            className="mt-2"
            tone="success"
          />
          <p className="mt-2 text-xs text-[var(--muted)]">
            Awarded when your report enters the AMC queue
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Priority</span>
            <span className="font-semibold capitalize">{report.priority}</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
            Ward desk may adjust priority after site review. Triage tools stay
            on the admin portal.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="glass-card p-5 sm:p-6">
            <PageHeader
              eyebrow="Issue brief"
              title="What citizens reported"
              description={report.description}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Meta label="Department" value={report.departmentId.replace("-", " ")} />
              <Meta
                label="Assigned to"
                value={report.assignedTo ?? "Pending assignment"}
              />
              <Meta label="Points awarded" value={String(report.pointsAwarded)} />
              <Meta
                label="Coordinates"
                value={`${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
              />
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Clock3 className="h-4 w-4" />
              <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
                Status tracker
              </h2>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {STATUS_STEPS.map((step, index) => {
                const reached =
                  report.timeline.some((t) => t.status === step) ||
                  index <= stepIndex ||
                  (step === "resolved" && report.status === "resolved");
                return (
                  <div
                    key={step}
                    className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold capitalize ${
                      reached
                        ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {statusLabel(step)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">Resolution history</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Timeline events from intake through AMC field updates
            </p>
            <div className="mt-5 space-y-4">
              {report.timeline.map((event) => (
                <div
                  key={event.id}
                  className="relative border-l-2 border-[var(--brand)] pl-4"
                >
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(event.at).toLocaleString("en-IN")} · {event.actor}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{event.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[var(--brand)]" />
              <h2 className="font-display text-xl font-semibold">Ward conversation</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Mock civic notes from neighbours and AMC desk — Ahmedabad context only
            </p>
            <div className="mt-4 space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-[var(--border)] bg-white/40 p-4 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{comment.author}</p>
                      <p className="text-xs text-[var(--muted)]">{comment.role}</p>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(comment.at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <AiVsActualPanel report={report} compact />

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <ShieldCheck className="h-4 w-4" />
              <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
                AMC review status
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Authenticity checks and department triage run on the AMC admin
              desk after you submit. You will see status updates here as ward
              teams acknowledge and assign the ticket.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 text-[var(--accent)]" />
                Priority:{" "}
                <span className="font-semibold capitalize text-[var(--foreground)]">
                  {report.priority}
                </span>
              </li>
              <li>
                Opened{" "}
                {new Date(report.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </li>
              <li>Last update {new Date(report.updatedAt).toLocaleString("en-IN")}</li>
            </ul>
          </div>

          {nearby.length > 0 ? (
            <div className="glass-card p-5">
              <h3 className="font-display text-lg font-semibold">Nearby reports</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Same corridor / ward cluster from API
              </p>
              <div className="mt-4 space-y-2">
                {nearby.map((item) => (
                  <Link
                    key={item.id}
                    href={`/citizen/reports/${item.id}`}
                    className="block rounded-2xl border border-[var(--border)] px-3 py-3 transition hover:border-[var(--brand)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="text-xs text-[var(--muted)]">
                        {item.distanceKm} km
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.ward} · {item.priority}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
