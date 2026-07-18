"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MapPin,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AiAnalysisPanel } from "@/components/report/ai-analysis-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { AiAnalysis, Priority, ReportCategory, Ward } from "@/types";

const LocationPicker = dynamic(() => import("@/components/map/location-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/40 text-sm text-[var(--muted)] dark:bg-white/5">
      Loading Ahmedabad map pin…
    </div>
  ),
});

const categories: ReportCategory[] = [
  "roads",
  "water",
  "drainage",
  "lighting",
  "waste",
  "footpath",
  "other",
];

const priorities: Priority[] = ["low", "medium", "high", "critical"];

const steps = [
  { id: 1, label: "Upload Images", icon: Camera },
  { id: 2, label: "Issue Details", icon: Upload },
  { id: 3, label: "Map pin", icon: MapPin },
] as const;

type PreviewFile = {
  id: string;
  name: string;
  dataUrl: string;
};

export default function NewCitizenReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [wards, setWards] = useState<Ward[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("roads");
  const [priority, setPriority] = useState<Priority>("medium");
  const [wardName, setWardName] = useState("Vastrapur");
  const [address, setAddress] = useState("Near Vastrapur Lake, Ahmedabad");
  const [latitude, setLatitude] = useState(23.0387);
  const [longitude, setLongitude] = useState(72.5289);
  const [locationPinned, setLocationPinned] = useState(false);
  const [roadName, setRoadName] = useState("");
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  const simulateUpload = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      toast.error("Please drop image files only");
      return;
    }

    setUploading(true);
    setUploadProgress(8);
    let tick = 8;
    const timer = window.setInterval(() => {
      tick = Math.min(96, tick + 12 + Math.floor(Math.random() * 10));
      setUploadProgress(tick);
      if (tick >= 96) window.clearInterval(timer);
    }, 160);

    void Promise.all(
      list.slice(0, 4).map(
        (file) =>
          new Promise<PreviewFile>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `${file.name}-${file.lastModified}`,
                name: file.name,
                dataUrl: String(reader.result),
              });
            };
            reader.onerror = () => reject(new Error("Could not read image"));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((next) => {
        setPreviews((prev) => [...prev, ...next].slice(0, 6));
        setUploadProgress(100);
        toast.success(`${next.length} image${next.length > 1 ? "s" : ""} ready for preview`);
      })
      .catch(() => toast.error("Image preview failed"))
      .finally(() => {
        window.clearInterval(timer);
        window.setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 400);
      });
  }, []);

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
      setPriority(json.data.analysis.suggestedPriority);
      toast.success(
        `Exa checked authenticity (${json.data.analysis.authenticity.replace("_", " ")}) · priority ${json.data.analysis.priorityScore}/100`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function startManualAnalysis() {
    const blank: AiAnalysis = {
      detection: "",
      damageClass: "",
      severity: priority,
      summary: "",
      suggestedDepartment: "roads",
      suggestedPriority: priority,
      confidence: 0.7,
      authenticity: "uncertain",
      authenticityScore: 0.5,
      priorityScore:
        priority === "critical"
          ? 90
          : priority === "high"
            ? 70
            : priority === "medium"
              ? 50
              : 30,
      issueDetected: title.trim() || "",
    };
    setAnalysis(blank);
    toast.message("Fill authenticity, issue, and priority yourself — no AI required");
  }

  function applyLocationPick(pick: {
    latitude: number;
    longitude: number;
    label?: string;
  }) {
    setLatitude(Number(pick.latitude.toFixed(5)));
    setLongitude(Number(pick.longitude.toFixed(5)));
    setLocationPinned(true);
    if (pick.label) {
      const short = pick.label.split(",").slice(0, 3).join(",").trim();
      setAddress(short);
      setRoadName(pick.label.split(",")[0]?.trim() ?? "");
      const match = wards.find((w) =>
        pick.label!.toLowerCase().includes(w.name.toLowerCase())
      );
      if (match) {
        setWardName(match.name);
      }
    }
  }

  async function submitReport() {
    if (!locationPinned) {
      setStep(3);
      toast.error("Map location is compulsory — search or pin the exact spot");
      return;
    }
    if (address.trim().length < 4) {
      setStep(3);
      toast.error("Add a landmark / address for the pinned location");
      return;
    }

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
          address: roadName
            ? `${address}${address.includes(roadName) ? "" : ` · ${roadName}`}`
            : address,
          latitude,
          longitude,
          priority: analysis?.suggestedPriority ?? priority,
          runAi: !analysis,
          ai: analysis ?? undefined,
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

  const canAdvance = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) {
      return (
        title.trim().length >= 4 &&
        description.trim().length >= 10 &&
        Boolean(wardName) &&
        address.trim().length >= 4
      );
    }
    return locationPinned && address.trim().length >= 4;
  }, [step, title, description, wardName, address, locationPinned]);

  const selectClass =
    "flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AMC civic intake"
        title="Report an infrastructure issue"
        description="Walk through photo evidence, issue details, and a precise map pin so Roads, Drainage, and Electrical desks can dispatch faster across Ahmedabad."
      />

      <div className="glass-card p-4 sm:p-5">
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((item) => {
            const active = step === item.id;
            const done = step > item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : done
                        ? "border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-500/10"
                        : "border-[var(--border)] bg-white/40 dark:bg-white/5"
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                      active || done
                        ? "bg-[var(--brand)] text-white"
                        : "bg-slate-200/70 text-[var(--muted)] dark:bg-white/10"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Step {item.id}
                    </p>
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card space-y-5 p-5 sm:p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Upload site photos</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Capture pothole clusters, waterlogging near BRTS stops, or streetlight
                  outages. Previews stay on-device — optional for API submit.
                </p>
              </div>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.length) simulateUpload(e.dataTransfer.files);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 py-12 text-center transition ${
                  dragOver
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)] bg-white/40 dark:bg-white/5"
                }`}
              >
                <ImagePlus className="h-10 w-10 text-[var(--brand)]" />
                <p className="mt-3 text-sm font-semibold">Drag & drop images here</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  or browse from phone / desktop · JPG, PNG
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) simulateUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              {uploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Preparing preview…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} tone="brand" />
                </div>
              ) : null}

              {previews.length ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {previews.map((file) => (
                    <div
                      key={file.id}
                      className="group relative overflow-hidden rounded-2xl border border-[var(--border)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="h-36 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPreviews((prev) => prev.filter((p) => p.id !== file.id))
                        }
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white opacity-90 transition hover:bg-rose-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <p className="truncate bg-slate-950/50 px-2 py-1 text-[10px] text-white">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-sm text-[var(--muted)] dark:bg-white/5">
                  No photos yet — you can continue and pin the issue on SG Highway,
                  Drive-In Road, or your ward landmark.
                </p>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Issue details</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Use landmarks AMC crews know — ISKCON crossroads, Himalaya Mall,
                  Law Garden, or Sabarmati Riverfront access roads.
                </p>
              </div>

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
                  placeholder="Include severity, time-of-day impact, and nearby landmarks for field crews."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className={selectClass}
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
                  <Label htmlFor="priority">Severity / priority</Label>
                  <select
                    id="priority"
                    className={selectClass}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ward">Ward</Label>
                  <select
                    id="ward"
                    className={selectClass}
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
                <div className="space-y-2">
                  <Label htmlFor="address">Landmark / address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Opposite Himalaya Mall, Drive-In Road"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Map location (compulsory)
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Search an Ahmedabad place, select it, then fine-tune the pin.
                    Reports cannot be submitted without a confirmed map location.
                  </p>
                </div>
                <Badge tone={locationPinned ? "success" : "warning"}>
                  {locationPinned ? "Location confirmed" : "Pin required"}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="surface-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Latitude
                  </p>
                  <p className="mt-1 font-semibold tabular-nums">{latitude.toFixed(5)}</p>
                </div>
                <div className="surface-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Longitude
                  </p>
                  <p className="mt-1 font-semibold tabular-nums">{longitude.toFixed(5)}</p>
                </div>
                <div className="surface-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Ward
                  </p>
                  <p className="mt-1 font-semibold">{wardName}</p>
                </div>
                <div className="surface-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Road / place
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {roadName || "Select from search"}
                  </p>
                </div>
                <div className="surface-card p-3 sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Landmark
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">{address}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address-step3">Landmark / address</Label>
                <Input
                  id="address-step3"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Confirm landmark near the pin"
                  required
                />
              </div>

              <div className="h-[420px] overflow-hidden rounded-2xl border border-[var(--border)]">
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onPick={applyLocationPick}
                />
              </div>

              {!locationPinned ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Search a location or click the map to drop your pin before submitting.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                disabled={!canAdvance}
                onClick={() => setStep((s) => Math.min(3, s + 1))}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Badge tone={locationPinned ? "success" : "warning"}>
                {locationPinned
                  ? "Location ready — submit when done"
                  : "Confirm map pin to continue"}
              </Badge>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <AiAnalysisPanel
            analysis={analysis}
            loading={analyzing}
            editable
            onChange={setAnalysis}
          />
          <div className="glass-card space-y-3 p-5">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">AMC actions</p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Location pin is compulsory. Exa checks authenticity and priority —
              or write those scores yourself.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={analyzing}
              onClick={() => void runAiAnalyze()}
            >
              {analyzing ? "Analyzing…" : "Run Exa authenticity check"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={startManualAnalysis}
            >
              Write scores manually (no AI)
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={
                submitting ||
                title.trim().length < 4 ||
                !locationPinned ||
                address.trim().length < 4
              }
              onClick={() => void submitReport()}
            >
              {submitting
                ? "Submitting…"
                : !locationPinned
                  ? "Pin location to submit"
                  : "Submit to AMC"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
