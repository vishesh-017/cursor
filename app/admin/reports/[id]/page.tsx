"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ModerateCitizen } from "@/components/admin/moderate-citizen";
import { AiAnalysisPanel } from "@/components/report/ai-analysis-panel";
import { AiVsActualPanel } from "@/components/report/ai-vs-actual";
import { EvidenceGallery } from "@/components/report/evidence-gallery";
import {
  evidenceRiskLevel,
  PhotoEvidenceAlert,
  PhotoEvidenceChips,
} from "@/components/report/photo-evidence-alert";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  AccountStatus,
  AiAnalysis,
  DepartmentId,
  InfrastructureReport,
  Priority,
  ReportStatus,
} from "@/types";
import { cn } from "@/utils/cn";
import { riskLabel } from "@/utils/risk";
import { ADMIN_STATUS_ACTIONS, statusLabel } from "@/utils/status";

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
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citizenStatus, setCitizenStatus] = useState<{
    accountStatus: AccountStatus;
    flagCount: number;
    moderationNote?: string;
  } | null>(null);

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

        const userRes = await fetch(`/api/users/${next.citizenId}`, {
          cache: "no-store",
        });
        const userJson = (await userRes.json()) as {
          success: boolean;
          data?: {
            user: {
              accountStatus?: AccountStatus;
              flagCount?: number;
              moderationNote?: string;
            };
          };
        };
        if (userRes.ok && userJson.success && userJson.data?.user) {
          setCitizenStatus({
            accountStatus: userJson.data.user.accountStatus ?? "active",
            flagCount: userJson.data.user.flagCount ?? 0,
            moderationNote: userJson.data.user.moderationNote,
          });
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
  }, [params.id]);

  async function patchReport(
    body: Record<string, unknown>,
    successMessage = "Report updated"
  ) {
    const res = await fetch(`/api/reports/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      success: boolean;
      message?: string;
      data?: { report: InfrastructureReport };
    };
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.message || "Update failed");
    }
    const next = json.data.report;
    setReport(next);
    setStatus(next.status);
    setPriority(next.priority);
    setDepartmentId(next.departmentId);
    setAssignedTo(next.assignedTo ?? "");
    toast.success(successMessage);
    return next;
  }

  async function saveUpdates() {
    setSaving(true);
    try {
      await patchReport({
        status,
        priority,
        departmentId,
        assignedTo: assignedTo || undefined,
        timelineNote: timelineNote || undefined,
      });
      setTimelineNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus(next: ReportStatus, note: string) {
    setSaving(true);
    try {
      await patchReport(
        {
          status: next,
          priority,
          departmentId,
          assignedTo: assignedTo || undefined,
          timelineNote: timelineNote.trim() || note,
        },
        `Status → ${statusLabel(next)}`
      );
      setTimelineNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setSaving(false);
    }
  }

  async function runAmcAiTriage() {
    if (!report) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: report.title,
          description: report.description,
          category: report.category,
          ward: report.ward,
          imageUrl: report.imageUrl ?? report.imageUrls?.[0],
          includeStandards: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { analysis: AiAnalysis };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "AI triage failed");
      }
      const analysis = json.data.analysis;
      // Persist AI prediction only — keep actual AMC priority/department for comparison.
      const patchRes = await fetch(`/api/reports/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: analysis,
          timelineNote: `Exa AI risk: ${riskLabel(analysis.suggestedPriority)} · confidence ${Math.round(analysis.confidence * 100)}% · ${analysis.issueDetected}`,
        }),
      });
      const patchJson = (await patchRes.json()) as {
        success: boolean;
        message?: string;
        data?: { report: InfrastructureReport };
      };
      if (!patchRes.ok || !patchJson.success || !patchJson.data) {
        throw new Error(patchJson.message || "Failed to save AI triage");
      }
      setReport(patchJson.data.report);
      toast.success(
        `AI risk ${riskLabel(analysis.suggestedPriority)} · ${Math.round(analysis.confidence * 100)}% confidence`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI triage failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyAiPrediction() {
    if (!report?.ai) {
      toast.error("Run Exa triage first");
      return;
    }
    setSaving(true);
    try {
      await patchReport(
        {
          priority: report.ai.suggestedPriority,
          departmentId: report.ai.suggestedDepartment,
          timelineNote: `Applied AI prediction: ${riskLabel(report.ai.suggestedPriority)} → ${report.ai.suggestedDepartment}`,
        },
        "AI prediction applied to ticket"
      );
      setPriority(report.ai.suggestedPriority);
      setDepartmentId(report.ai.suggestedDepartment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply AI");
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {report.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Filed by {report.citizenName} · {report.ward} · {report.address}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
            <Badge tone={statusTone(report.status)}>
              {statusLabel(report.status)}
            </Badge>
            <Badge tone="default">{report.category}</Badge>
            <PhotoEvidenceChips ai={report.ai} />
          </div>
        </div>
        <Link href="/admin/reports">
          <Button variant="outline">Inbox</Button>
        </Link>
      </div>

      <PhotoEvidenceAlert ai={report.ai} />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Application status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Move this ticket through the AMC workflow. Citizens see these updates on
            their report page.
          </p>
          <div className="flex flex-wrap gap-2">
            {ADMIN_STATUS_ACTIONS.map((action) => {
              const active = report.status === action.status;
              return (
                <Button
                  key={action.status}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={saving || active}
                  onClick={() => void applyStatus(action.status, action.note)}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-amber-200/80">
        <CardHeader>
          <CardTitle>Fake report — citizen moderation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[var(--muted)]">
            If this ticket looks staged or abusive, flag the citizen, suspend
            their login, or remove the account. You can reject this report at the
            same time.
          </p>
          <ModerateCitizen
            citizenId={report.citizenId}
            citizenName={report.citizenName}
            reportId={report.id}
            rejectReportDefault
            compact
            accountStatus={citizenStatus?.accountStatus ?? "active"}
            flagCount={citizenStatus?.flagCount ?? 0}
            moderationNote={citizenStatus?.moderationNote}
            onModerated={(user) => {
              setCitizenStatus({
                accountStatus: user.accountStatus ?? "active",
                flagCount: user.flagCount ?? 0,
                moderationNote: user.moderationNote,
              });
              void fetch(`/api/reports/${params.id}`, { cache: "no-store" })
                .then((res) => res.json())
                .then((json: { success?: boolean; data?: { report: InfrastructureReport } }) => {
                  if (json.success && json.data?.report) {
                    setReport(json.data.report);
                    setStatus(json.data.report.status);
                  }
                });
            }}
          />
        </CardContent>
      </Card>

      <AiVsActualPanel report={report} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card
            className={cn(
              "glass-card",
              evidenceRiskLevel(report.ai) === "high" &&
                "border-rose-300/70 dark:border-rose-500/40"
            )}
          >
            <CardHeader>
              <CardTitle>Citizen photo evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <EvidenceGallery report={report} />
              {report.ai?.imageRelevant || report.ai?.imageOrigin ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]/70 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      AI image scan for officers
                    </p>
                    <PhotoEvidenceChips ai={report.ai} />
                  </div>
                  <p className="mt-2 text-[var(--muted)]">
                    {report.ai.imageScene}
                    {report.ai.imageDepartmentHint
                      ? ` · dept ${report.ai.imageDepartmentHint.replace("-", " ")}`
                      : ""}
                    {typeof report.ai.imageRelevanceScore === "number"
                      ? ` · relevance ${Math.round(report.ai.imageRelevanceScore * 100)}%`
                      : ""}
                    {typeof report.ai.imageOriginScore === "number"
                      ? ` · origin ${Math.round(report.ai.imageOriginScore * 100)}%`
                      : ""}
                  </p>
                  {report.ai.imageIssueHint ? (
                    <p className="mt-1 text-[var(--muted)]">{report.ai.imageIssueHint}</p>
                  ) : null}
                  {report.ai.imageNotes ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">{report.ai.imageNotes}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--muted)]">
              <p>{report.description}</p>
              <p>
                <span className="font-medium text-[var(--foreground)]">Coordinates:</span>{" "}
                {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
              </p>
              <p>
                <span className="font-medium text-[var(--foreground)]">Updated:</span>{" "}
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
                  <p className="text-sm font-semibold text-[var(--foreground)]">{event.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(event.at).toLocaleString("en-IN")} · {event.actor}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{event.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">AMC AI actions</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={analyzing}
                  onClick={() => void runAmcAiTriage()}
                >
                  {analyzing ? "Running Exa…" : "Run Exa risk + confidence"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || analyzing || !report.ai}
                  onClick={() => void applyAiPrediction()}
                >
                  Apply AI risk to ticket
                </Button>
              </div>
            </div>
            <AiAnalysisPanel analysis={report.ai ?? null} loading={analyzing} />
          </div>
        </div>

        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle>AMC assign & update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)]"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)]"
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
                className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)]"
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
