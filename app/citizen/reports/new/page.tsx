"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, priorityTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiAnalysis, ReportCategory, Ward } from "@/types";

const categories: ReportCategory[] = [
  "roads",
  "water",
  "drainage",
  "lighting",
  "waste",
  "footpath",
  "other",
];

export default function NewCitizenReportPage() {
  const router = useRouter();
  const [wards, setWards] = useState<Ward[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("roads");
  const [wardName, setWardName] = useState("Vastrapur");
  const [address, setAddress] = useState("Near Vastrapur Lake, Ahmedabad");
  const [latitude, setLatitude] = useState(23.0387);
  const [longitude, setLongitude] = useState(72.5289);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/meta", { cache: "no-store" });
      const json = (await res.json()) as {
        success: boolean;
        data?: { wards: Ward[] };
      };
      if (res.ok && json.success && json.data) {
        setWards(json.data.wards);
      }
    })();
  }, []);

  function applyWard(name: string) {
    setWardName(name);
    const match = wards.find((w) => w.name === name);
    if (match) {
      setLatitude(match.center.lat);
      setLongitude(match.center.lng);
    }
  }

  async function runAiAnalyze() {
    if (title.trim().length < 4 || description.trim().length < 10) {
      toast.error("Add a clear title and description before AI analysis");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          ward: wardName,
          includeStandards: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { analysis: AiAnalysis };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "AI analysis failed");
      }
      setAnalysis(json.data.analysis);
      toast.success("AI analysis ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function submitReport() {
    setSubmitting(true);
    try {
      const ward = wards.find((w) => w.name === wardName);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          ward: wardName,
          wardId: ward?.id,
          address,
          latitude,
          longitude,
          priority: analysis?.suggestedPriority,
          runAi: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { report: { id: string } };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Submission failed");
      }
      toast.success("Report submitted to AMC queue");
      router.push(`/citizen/reports/${json.data.report.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Report an infrastructure issue
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Describe the problem with landmarks AMC crews know — SG Highway
          service roads, BRTS stops, underpasses, or lake-side stretches.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Issue details</CardTitle>
            <CardDescription>
              Accurate location helps Roads, Drainage, and Electrical desks respond faster.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pothole cluster near ISKCON crossroads"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include severity, time of day impact, and nearby landmarks for field crews."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
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
                <Label htmlFor="ward">Ward</Label>
                <select
                  id="ward"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={wardName}
                  onChange={(e) => applyWard(e.target.value)}
                >
                  {(wards.length
                    ? wards.map((w) => w.name)
                    : ["Vastrapur", "Thaltej", "Ellisbridge", "Maninagar"]
                  ).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address / landmark</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Opposite Himalaya Mall, Drive-In Road"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={analyzing}
                onClick={() => void runAiAnalyze()}
              >
                {analyzing ? "Analyzing…" : "Run Exa analyze"}
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void submitReport()}
              >
                {submitting ? "Submitting…" : "Submit to AMC"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>AI triage preview</CardTitle>
            <CardDescription>
              Exa AI suggests department, severity, and repair notes before you submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!analysis ? (
              <p className="text-sm text-slate-500">
                Run Exa analyze to preview detection class, confidence, and suggested
                AMC department routing.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={priorityTone(analysis.suggestedPriority)}>
                    {analysis.suggestedPriority}
                  </Badge>
                  <Badge tone="brand">{analysis.suggestedDepartment}</Badge>
                  <Badge tone="info">
                    {(analysis.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900">{analysis.detection}</p>
                <p className="text-sm text-slate-600">{analysis.summary}</p>
                {analysis.standardsNote ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Standards note</p>
                    <p className="mt-1">{analysis.standardsNote}</p>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
