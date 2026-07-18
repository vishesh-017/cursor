"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  DepartmentId,
  InfrastructureReport,
  Priority,
  ReportStatus,
} from "@/types";

const statusOptions: ReportStatus[] = [
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
];

const priorityOptions: Priority[] = ["low", "medium", "high", "critical"];

const departmentOptions: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

export default function AdminReportDetailPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<InfrastructureReport | null>(null);
  const [status, setStatus] = useState<ReportStatus>("submitted");
  const [priority, setPriority] = useState<Priority>("medium");
  const [departmentId, setDepartmentId] = useState<DepartmentId>("roads");
  const [assignedTo, setAssignedTo] = useState("");
  const [timelineNote, setTimelineNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          data?: { report: InfrastructureReport };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Report not found");
        }
        if (!active) return;
        const next = json.data.report;
        setReport(next);
        setStatus(next.status);
        setPriority(next.priority);
        setDepartmentId(next.departmentId);
        setAssignedTo(next.assignedTo ?? "");
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
  }, [params.id]);

  async function saveUpdates() {
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          departmentId,
          assignedTo: assignedTo || undefined,
          timelineNote: timelineNote || undefined,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { report: InfrastructureReport };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Update failed");
      }
      setReport(json.data.report);
      setTimelineNote("");
      toast.success("Report updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <EmptyState
        title="Report unavailable"
        description={error ?? "Ticket could not be loaded."}
        action={
          <Link href="/admin/reports">
            <Button variant="outline">Back to inbox</Button>
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
            Filed by {report.citizenName} · {report.ward} · {report.address}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
            <Badge tone={statusTone(report.status)}>
              {report.status.replace("_", " ")}
            </Badge>
            <Badge tone="default">{report.category}</Badge>
          </div>
        </div>
        <Link href="/admin/reports">
          <Button variant="outline">Inbox</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>{report.description}</p>
              <p>
                <span className="font-medium text-slate-900">Coordinates:</span>{" "}
                {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Updated:</span>{" "}
                {new Date(report.updatedAt).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.timeline.map((event) => (
                <div key={event.id} className="border-l-2 border-teal-700 pl-4">
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(event.at).toLocaleString("en-IN")} · {event.actor}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {report.ai ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>AI analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{report.ai.detection}</p>
                <p>{report.ai.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={priorityTone(report.ai.suggestedPriority)}>
                    Suggested {report.ai.suggestedPriority}
                  </Badge>
                  <Badge tone="brand">{report.ai.suggestedDepartment}</Badge>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle>Assign & update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept">Department</Label>
              <select
                id="dept"
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
              >
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Assigned officer</Label>
              <Input
                id="assignee"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Er. Ketan Patel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Timeline note</Label>
              <Textarea
                id="note"
                value={timelineNote}
                onChange={(e) => setTimelineNote(e.target.value)}
                placeholder="Crew dispatched / jetting unit on site…"
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void saveUpdates()}>
              {saving ? "Saving…" : "Save updates"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
