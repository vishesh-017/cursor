"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BrainCircuit,
  Building2,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AiAnalysisPanel } from "@/components/report/ai-analysis-panel";
import { OpsInsightPanel } from "@/components/ai/ops-insight-panel";
import { ResearchPanel } from "@/components/intel/research-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { OpsInsight } from "@/lib/ai/ops-insights";
import type { AiAnalysis, ReportCategory } from "@/types";
import { riskLabel } from "@/utils/risk";
import { cn } from "@/utils/cn";

const categories: ReportCategory[] = [
  "roads",
  "water",
  "drainage",
  "lighting",
  "waste",
  "footpath",
  "other",
];

const samples = [
  {
    label: "Pothole · Roads",
    title: "Deep pothole cluster on SG Highway service road",
    description:
      "Three consecutive potholes near ISKCON crossroads on the service lane. Two-wheeler skids reported during morning peak near Thaltej.",
    category: "roads" as ReportCategory,
    ward: "Thaltej",
  },
  {
    label: "Waterlogging · Drainage",
    title: "Underpass waterlogging after overnight rain",
    description:
      "Knee-deep waterlogging at Maninagar underpass after monsoon shower. Drainage grate clogged with plastic and silt; traffic diverted.",
    category: "drainage" as ReportCategory,
    ward: "Maninagar",
  },
  {
    label: "Streetlight · Electrical",
    title: "Dark stretch of streetlights on CG Road",
    description:
      "Four consecutive streetlights out near Ellisbridge turning, creating a dark corridor for pedestrians after 8 PM.",
    category: "lighting" as ReportCategory,
    ward: "Ellisbridge",
  },
];

type Tab = "predict" | "departments" | "research";

type DeptPulse = {
  id: string;
  name: string;
  head: string;
  liveOpen: number;
  liveCritical: number;
  resolvedSample: number;
  avgResolutionHours: number;
  efficiency: number;
  backlogRisk: "low" | "medium" | "high";
  performanceLabel: string;
  predictedClearanceDays: number;
};

type Pattern = {
  key: string;
  ward: string;
  category: string;
  count: number;
  sampleTitle: string;
};

export function AiAnalysisLab() {
  const [tab, setTab] = useState<Tab>("predict");
  const [title, setTitle] = useState(samples[0].title);
  const [description, setDescription] = useState(samples[0].description);
  const [category, setCategory] = useState<ReportCategory>(samples[0].category);
  const [ward, setWard] = useState(samples[0].ward);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [ops, setOps] = useState<OpsInsight | null>(null);
  const [departments, setDepartments] = useState<DeptPulse[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  useEffect(() => {
    void fetch("/api/ai/ops", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (json: {
          success?: boolean;
          data?: { departments: DeptPulse[]; patterns: Pattern[] };
        }) => {
          if (json.success && json.data) {
            setDepartments(json.data.departments);
            setPatterns(json.data.patterns);
          }
        }
      )
      .catch(() => undefined);
  }, []);

  async function runPrediction() {
    if (title.trim().length < 4 || description.trim().length < 10) {
      toast.error("Add a longer title and description");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          ward,
          runExa: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: {
          analysis: AiAnalysis | null;
          ops: OpsInsight;
          departments: DeptPulse[];
          patterns: Pattern[];
        };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Prediction failed");
      }
      setAnalysis(json.data.analysis);
      setOps(json.data.ops);
      setDepartments(json.data.departments);
      setPatterns(json.data.patterns);
      toast.success("Operational AI prediction ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "predict", label: "Issue prediction" },
    { id: "departments", label: "How departments are working" },
    { id: "research", label: "Exa research" },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-slate-950 text-white shadow-[var(--shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(43,181,174,0.35),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(224,138,82,0.2),transparent_35%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              <BrainCircuit className="h-3.5 w-3.5" />
              Urbanexus AI ops
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Predict clearance, spot clusters, judge department load
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Useful AI for AMC — not just labels. Estimate how long a ticket may
              take, whether it sits in a ward cluster, if safety language raises
              urgency, and which desks are stretched.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
              What this answers
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>· When might this issue clear?</li>
              <li>· Is the department overloaded?</li>
              <li>· Are similar tickets already open nearby?</li>
              <li>· Does the wording imply a safety risk?</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              tab === item.id
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)] dark:text-teal-100"
                : "border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted)] hover:border-[var(--brand)]/40"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "research" ? <ResearchPanel /> : null}

      {tab === "departments" ? (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
              Department working pulse
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Live open load from the inbox, blended with AMC efficiency and
              average resolution time — predicts clearance pressure.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {departments.map((dept) => (
              <article key={dept.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-semibold capitalize text-[var(--foreground)]">
                      {dept.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{dept.head}</p>
                  </div>
                  <Badge
                    tone={
                      dept.backlogRisk === "high"
                        ? "danger"
                        : dept.backlogRisk === "medium"
                          ? "warning"
                          : "success"
                    }
                  >
                    {dept.backlogRisk} load
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-[var(--surface-solid)] px-2 py-3 ring-1 ring-[var(--border)]">
                    <p className="text-lg font-semibold tabular-nums">{dept.liveOpen}</p>
                    <p className="text-[10px] text-[var(--muted)]">Open</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-solid)] px-2 py-3 ring-1 ring-[var(--border)]">
                    <p className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-300">
                      {dept.liveCritical}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">Critical</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-solid)] px-2 py-3 ring-1 ring-[var(--border)]">
                    <p className="text-lg font-semibold tabular-nums">
                      {dept.predictedClearanceDays}d
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">Clear ETA</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">{dept.performanceLabel}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                    <span>Efficiency</span>
                    <span>{dept.efficiency}%</span>
                  </div>
                  <Progress value={dept.efficiency} tone="brand" />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Avg resolution {dept.avgResolutionHours}h · sample resolved{" "}
                  {dept.resolvedSample}
                </p>
              </article>
            ))}
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <TrendingUp className="h-4 w-4" />
              <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
                Hot issue patterns
              </h3>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Open tickets grouped by ward + category — useful for crew bundling.
            </p>
            <div className="mt-4 space-y-2">
              {patterns.length ? (
                patterns.map((p) => (
                  <div
                    key={p.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {p.ward} · {p.category}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{p.sampleTitle}</p>
                    </div>
                    <Badge tone={p.count >= 3 ? "danger" : "brand"}>
                      {p.count} open
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">No open patterns yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "predict" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Sparkles className="h-4 w-4" />
              <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
                Predict this issue
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Run Exa triage plus operational math on live AMC backlog — ETA,
              cluster risk, department stretch, and recommended action.
            </p>

            <div className="flex flex-wrap gap-2">
              {samples.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setTitle(sample.title);
                    setDescription(sample.description);
                    setCategory(sample.category);
                    setWard(sample.ward);
                    setAnalysis(null);
                    setOps(null);
                  }}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-title">Title</Label>
              <Input
                id="ai-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-desc">Description</Label>
              <Textarea
                id="ai-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-cat">Category</Label>
                <select
                  id="ai-cat"
                  className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-ward">Ward</Label>
                <Input
                  id="ai-ward"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={loading}
              onClick={() => void runPrediction()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Predicting…
                </>
              ) : (
                <>
                  <BrainCircuit className="h-4 w-4" />
                  Run useful AI prediction
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {ops ? (
              <>
                {analysis ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="brand">
                      Exa risk · {riskLabel(analysis.suggestedPriority)}
                    </Badge>
                    <Badge tone="default">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </Badge>
                    <Badge tone="warning">
                      Authenticity · {analysis.authenticity.replace("_", " ")}
                    </Badge>
                  </div>
                ) : null}
                <OpsInsightPanel ops={ops} />
                {analysis ? (
                  <details className="glass-card p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                      Full Exa triage details
                    </summary>
                    <div className="mt-4">
                      <AiAnalysisPanel analysis={analysis} />
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <div className="glass-card flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
                <Building2 className="h-10 w-10 text-[var(--brand)]" />
                <h3 className="mt-4 font-display text-xl font-semibold text-[var(--foreground)]">
                  Operational prediction panel
                </h3>
                <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
                  Run a sample to see clearance ETA, department backlog risk,
                  similar open tickets in the ward, and a concrete AMC action.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
