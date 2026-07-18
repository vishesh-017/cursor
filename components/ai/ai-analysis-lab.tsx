"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BrainCircuit,
  Building2,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AiAnalysisPanel } from "@/components/report/ai-analysis-panel";
import { FraudAiPanel } from "@/components/ai/fraud-ai-panel";
import { OpsInsightPanel } from "@/components/ai/ops-insight-panel";
import { ResearchPanel } from "@/components/intel/research-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { FraudOpsSummary } from "@/lib/ai/fraud-insights";
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

type Tab = "fraud" | "predict" | "departments" | "research";

type DeptPulse = {
  id: string;
  name: string;
  head: string;
  liveOpen: number;
  liveCritical: number;
  fraudSuspects: number;
  avgFraudScore: number;
  resolvedSample: number;
  avgResolutionHours: number;
  efficiency: number;
  backlogRisk: "low" | "medium" | "high";
  performanceLabel: string;
  predictedClearanceDays: number;
  aiNote: string;
};

type Pattern = {
  key: string;
  ward: string;
  category: string;
  count: number;
  sampleTitle: string;
};

const emptyFraud: FraudOpsSummary = {
  scanned: 0,
  highRisk: 0,
  watchlist: 0,
  avgFraudScore: 0,
  topWards: [],
  aiBrief: "Loading Exa fraud scan…",
  reports: [],
};

export function AiAnalysisLab() {
  const [tab, setTab] = useState<Tab>("fraud");
  const [title, setTitle] = useState(samples[0].title);
  const [description, setDescription] = useState(samples[0].description);
  const [category, setCategory] = useState<ReportCategory>(samples[0].category);
  const [ward, setWard] = useState(samples[0].ward);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [ops, setOps] = useState<OpsInsight | null>(null);
  const [departments, setDepartments] = useState<DeptPulse[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [fraud, setFraud] = useState<FraudOpsSummary>(emptyFraud);
  const [pulseLoading, setPulseLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPulseLoading(true);
    void fetch("/api/ai/ops", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (json: {
          success?: boolean;
          data?: {
            departments: DeptPulse[];
            patterns: Pattern[];
            fraud: FraudOpsSummary;
          };
        }) => {
          if (!active || !json.success || !json.data) return;
          setDepartments(json.data.departments);
          setPatterns(json.data.patterns);
          if (json.data.fraud) setFraud(json.data.fraud);
        }
      )
      .catch(() => undefined)
      .finally(() => {
        if (active) setPulseLoading(false);
      });
    return () => {
      active = false;
    };
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

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: typeof ShieldAlert;
    hint: string;
  }> = [
    {
      id: "fraud",
      label: "Fraud AI",
      icon: ShieldAlert,
      hint: "Cut fake scores",
    },
    {
      id: "predict",
      label: "Issue prediction",
      icon: Sparkles,
      hint: "ETA & clusters",
    },
    {
      id: "departments",
      label: "Department pulse",
      icon: Building2,
      hint: "Desk load + AI",
    },
    {
      id: "research",
      label: "Exa research",
      icon: Search,
      hint: "City intel",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-teal-900/20 bg-[#0b1f24] text-white shadow-[0_24px_60px_-28px_rgba(15,80,80,0.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(45,190,170,0.38),transparent_48%),radial-gradient(ellipse_at_88%_20%,rgba(250,180,120,0.18),transparent_40%),linear-gradient(180deg,transparent_55%,rgba(0,0,0,0.35))]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative grid gap-8 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-100">
              <BrainCircuit className="h-3.5 w-3.5" />
              Urbanexus AI ops
            </p>
            <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.45rem]">
              Spot fraud, predict clearance, balance desk load
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Exa AI ranks authenticity, estimates how long tickets take, and
              highlights stretched AMC desks — so officers act on signal, not noise.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab("fraud")}
                className="rounded-full bg-rose-400/20 px-3 py-1.5 text-xs font-semibold text-rose-100 ring-1 ring-rose-300/30 transition hover:bg-rose-400/30"
              >
                {fraud.highRisk} high fraud risk
              </button>
              <button
                type="button"
                onClick={() => setTab("departments")}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15 transition hover:bg-white/15"
              >
                {departments.length} desks monitored
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Exa AI online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 self-end">
            {[
              {
                label: "Fraud watchlist",
                value: pulseLoading ? "—" : String(fraud.watchlist),
                sub: "score ≥ 35",
              },
              {
                label: "City fraud avg",
                value: pulseLoading ? "—" : String(fraud.avgFraudScore),
                sub: "0–100 scale",
              },
              {
                label: "Open patterns",
                value: pulseLoading ? "—" : String(patterns.length),
                sub: "ward clusters",
              },
              {
                label: "AI scanned",
                value: pulseLoading ? "—" : String(fraud.scanned),
                sub: "triaged tickets",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-100/80">
                  {stat.label}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-[11px] text-slate-400">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "group flex min-w-[148px] flex-col rounded-2xl border px-4 py-3 text-left transition",
                active
                  ? "border-teal-600/40 bg-teal-50 shadow-sm dark:border-teal-400/30 dark:bg-teal-500/10"
                  : "border-[var(--border)] bg-[var(--surface-solid)] hover:border-teal-500/30"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-teal-700 dark:text-teal-300" : "text-[var(--muted)]"
                  )}
                />
                {item.label}
              </span>
              <span className="mt-0.5 text-[11px] text-[var(--muted)]">
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "fraud" ? (
        <FraudAiPanel fraud={fraud} onUpdated={setFraud} />
      ) : null}

      {tab === "research" ? <ResearchPanel /> : null}

      {tab === "departments" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                Department working pulse
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
                Live open load, clearance ETA, and Exa fraud suspects per desk —
                so HQ can rebalance crews before backlog spikes.
              </p>
            </div>
            <Badge tone="brand">AI-enriched</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((dept) => (
              <article
                key={dept.id}
                className={cn(
                  "relative overflow-hidden rounded-[22px] border bg-[var(--surface-solid)] p-5 transition",
                  dept.backlogRisk === "high"
                    ? "border-rose-200/80 shadow-[0_12px_40px_-24px_rgba(190,40,60,0.45)]"
                    : dept.backlogRisk === "medium"
                      ? "border-amber-200/70"
                      : "border-[var(--border)] hover:border-teal-300/50"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-1",
                    dept.backlogRisk === "high"
                      ? "bg-rose-500"
                      : dept.backlogRisk === "medium"
                        ? "bg-amber-400"
                        : "bg-teal-500"
                  )}
                />
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

                <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
                  <div className="rounded-xl bg-slate-50 px-1.5 py-2.5 dark:bg-white/5">
                    <p className="text-base font-semibold tabular-nums">
                      {dept.liveOpen}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
                      Open
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-1.5 py-2.5 dark:bg-white/5">
                    <p className="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-300">
                      {dept.liveCritical}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
                      Critical
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-1.5 py-2.5 dark:bg-white/5">
                    <p className="text-base font-semibold tabular-nums">
                      {dept.predictedClearanceDays}d
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
                      Clear
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 px-1.5 py-2.5 dark:bg-rose-500/10">
                    <p className="text-base font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                      {dept.fraudSuspects}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-rose-700/80 dark:text-rose-300/80">
                      Fraud
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[var(--muted)]">
                  {dept.performanceLabel}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-teal-800 dark:text-teal-200">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  {dept.aiNote}
                </p>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                    <span>Efficiency</span>
                    <span>{dept.efficiency}%</span>
                  </div>
                  <Progress value={dept.efficiency} tone="brand" />
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Avg resolution {dept.avgResolutionHours}h · fraud avg{" "}
                  {dept.avgFraudScore} · resolved sample {dept.resolvedSample}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-solid)] p-5">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <TrendingUp className="h-4 w-4" />
              <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
                Hot issue patterns
              </h3>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Open tickets grouped by ward + category — useful for crew bundling.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {patterns.length ? (
                patterns.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {p.ward} · {p.category}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {p.sampleTitle}
                      </p>
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
          <div className="space-y-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-solid)] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Sparkles className="h-4 w-4" />
              <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
                Predict this issue
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Run Exa triage plus operational math on live AMC backlog — ETA,
              cluster risk, department stretch, authenticity, and action.
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
                  className="rounded-full border border-[var(--border)] bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:border-teal-500/40 dark:bg-white/5"
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
                  Predicting with Exa…
                </>
              ) : (
                <>
                  <BrainCircuit className="h-4 w-4" />
                  Run AI prediction
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
                    <Badge
                      tone={
                        analysis.authenticity === "possibly_fake"
                          ? "danger"
                          : analysis.authenticity === "uncertain"
                            ? "warning"
                            : "success"
                      }
                    >
                      Authenticity · {analysis.authenticity.replace("_", " ")}
                    </Badge>
                  </div>
                ) : null}
                <OpsInsightPanel ops={ops} />
                {analysis ? (
                  <details className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-solid)] p-4">
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
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface-solid)] p-8 text-center">
                <Building2 className="h-10 w-10 text-[var(--brand)]" />
                <h3 className="mt-4 font-display text-xl font-semibold text-[var(--foreground)]">
                  Operational prediction panel
                </h3>
                <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
                  Run a sample to see clearance ETA, department backlog risk,
                  similar open tickets, authenticity, and a concrete AMC action.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
