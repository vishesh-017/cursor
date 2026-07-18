"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport } from "@/types";

type NearbyReport = InfrastructureReport & { distanceKm: number };

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            {report.id}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            {report.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {report.address} · {report.ward}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
            <Badge tone={statusTone(report.status)}>
              {report.status.replace("_", " ")}
            </Badge>
            <Badge tone="default">{report.category}</Badge>
          </div>
        </div>
        <Link href="/citizen/reports">
          <Button variant="outline">All reports</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Issue description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>{report.description}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-medium text-slate-900">Department:</span>{" "}
                {report.departmentId}
              </p>
              <p>
                <span className="font-medium text-slate-900">Assigned to:</span>{" "}
                {report.assignedTo ?? "Pending assignment"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Points awarded:</span>{" "}
                {report.pointsAwarded}
              </p>
              <p>
                <span className="font-medium text-slate-900">Coordinates:</span>{" "}
                {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Status tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(
              [
                "submitted",
                "acknowledged",
                "assigned",
                "in_progress",
                "resolved",
              ] as const
            ).map((step) => {
              const reached =
                report.timeline.some((t) => t.status === step) ||
                report.status === step ||
                (step === "resolved" && report.status === "resolved");
              return (
                <div
                  key={step}
                  className={`rounded-lg border px-3 py-2 ${
                    reached
                      ? "border-teal-200 bg-teal-50 text-teal-900"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {step.replace("_", " ")}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.timeline.map((event) => (
              <div key={event.id} className="border-l-2 border-teal-600 pl-4">
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(event.at).toLocaleString("en-IN")} · {event.actor}
                </p>
                <p className="mt-1 text-sm text-slate-600">{event.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>AI analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {report.ai ? (
              <>
                <p className="font-semibold text-slate-900">{report.ai.detection}</p>
                <p>{report.ai.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={priorityTone(report.ai.severity)}>
                    {report.ai.severity}
                  </Badge>
                  <Badge tone="brand">{report.ai.damageClass}</Badge>
                  <Badge tone="info">
                    {(report.ai.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                {report.ai.standardsNote ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {report.ai.standardsNote}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-slate-500">No AI analysis attached to this ticket.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {nearby.length > 0 ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Nearby reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nearby.map((item) => (
              <Link
                key={item.id}
                href={`/citizen/reports/${item.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-teal-300"
              >
                <span className="font-medium text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-500">{item.distanceKm} km</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
