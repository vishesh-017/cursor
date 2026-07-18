"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MapPin,
  Navigation,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeLocation } from "@/hooks/use-realtime-location";
import type { InfrastructureReport, Priority, ReportCategory, Ward } from "@/types";
import {
  assessEvidencePhoto,
  type VisualSignals,
} from "@/lib/ai/image-scan";
import { isNearAhmedabad, nearestWard } from "@/utils/geo";
import { compressImageFile } from "@/utils/image-evidence";
import { cacheReport } from "@/utils/report-cache";

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
  signals: VisualSignals;
  scan: ReturnType<typeof assessEvidencePhoto>;
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
  const [locationSource, setLocationSource] = useState<"manual" | "gps" | null>(
    null
  );
  const [followLive, setFollowLive] = useState(false);
  const [awaitingGpsOnce, setAwaitingGpsOnce] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [roadName, setRoadName] = useState("");
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const reverseTimer = useRef<number | null>(null);
  const lastReverseKey = useRef("");
  const wardsRef = useRef<Ward[]>([]);

  const gps = useRealtimeLocation(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/meta", { cache: "no-store" });
      const json = (await res.json()) as {
        success: boolean;
        data?: { wards: Ward[] };
      };
      if (res.ok && json.success && json.data) {
        setWards(json.data.wards);
        wardsRef.current = json.data.wards;
      }
    })();
  }, []);

  // Auto-start live GPS on the map step; pause when leaving it.
  useEffect(() => {
    if (step !== 3) {
      if (followLive) {
        setFollowLive(false);
        gps.stopTracking();
      }
      return;
    }
    if (!gps.supported) return;
    setFollowLive(true);
    gps.startTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when step flips
  }, [step]);

  function applyWard(name: string) {
    setWardName(name);
    const match = wards.find((w) => w.name === name);
    if (match && locationSource !== "gps") {
      setLatitude(match.center.lat);
      setLongitude(match.center.lng);
    }
  }

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === lastReverseKey.current) return;
    if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
    reverseTimer.current = window.setTimeout(() => {
      lastReverseKey.current = key;
      void (async () => {
        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${lat}&lng=${lng}`,
            { cache: "no-store" }
          );
          const json = (await res.json()) as {
            success?: boolean;
            data?: { label: string; road: string; suburb?: string | null };
          };
          if (!res.ok || !json.success || !json.data) return;
          const short = json.data.label.split(",").slice(0, 3).join(",").trim();
          setAddress(short);
          setRoadName(json.data.road);
          const match =
            wardsRef.current.find((w) =>
              json.data!.label.toLowerCase().includes(w.name.toLowerCase())
            ) ?? nearestWard(lat, lng, wardsRef.current);
          if (match) setWardName(match.name);
        } catch {
          // Keep coords even if reverse geocode fails.
        }
      })();
    }, 600);
  }, []);

  const applyGpsFix = useCallback(
    (fix: {
      latitude: number;
      longitude: number;
      accuracy: number;
    }) => {
      if (!isNearAhmedabad(fix.latitude, fix.longitude)) {
        toast.error(
          "GPS is outside Ahmedabad metro — pin the issue on the map instead"
        );
        setFollowLive(false);
        gps.stopTracking();
        return;
      }
      setLatitude(Number(fix.latitude.toFixed(5)));
      setLongitude(Number(fix.longitude.toFixed(5)));
      setGpsAccuracy(fix.accuracy);
      setLocationPinned(true);
      setLocationSource("gps");
      const ward = nearestWard(fix.latitude, fix.longitude, wardsRef.current);
      if (ward) setWardName(ward.name);
      reverseGeocode(fix.latitude, fix.longitude);
    },
    [gps, reverseGeocode]
  );

  useEffect(() => {
    if (!gps.position) return;
    if (!followLive && !awaitingGpsOnce) return;
    applyGpsFix(gps.position);
    if (awaitingGpsOnce) setAwaitingGpsOnce(false);
  }, [followLive, awaitingGpsOnce, gps.position, applyGpsFix]);

  useEffect(() => {
    if (gps.error && followLive) {
      toast.error(gps.error);
    }
  }, [gps.error, followLive]);

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
      list.slice(0, 4).map(async (file) => {
        const { dataUrl, signals } = await compressImageFile(file);
        const scan = assessEvidencePhoto(signals, {
          title,
          description,
          category,
        });
        return {
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          dataUrl,
          signals,
          scan,
        } satisfies PreviewFile;
      })
    )
      .then((next) => {
        setPreviews((prev) => [...prev, ...next].slice(0, 6));
        setUploadProgress(100);
        const risky = next.filter(
          (p) =>
            p.scan.imageRelevant === "not_relevant" ||
            p.scan.imageOrigin === "possibly_ai_generated"
        );
        if (risky.length) {
          toast.error(
            `${risky.length} photo${risky.length > 1 ? "s" : ""} look unrelated or AI-generated — use a real site photo`
          );
        } else {
          toast.success(
            `${next.length} image${next.length > 1 ? "s" : ""} ready — evidence check passed`
          );
        }
      })
      .catch(() => toast.error("Image preview failed"))
      .finally(() => {
        window.clearInterval(timer);
        window.setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 400);
      });
  }, [title, description, category]);

  function applyLocationPick(pick: {
    latitude: number;
    longitude: number;
    label?: string;
  }) {
    // Manual search / map tap pauses live follow so the pin stays put.
    if (followLive) {
      setFollowLive(false);
      gps.stopTracking();
    }
    setLatitude(Number(pick.latitude.toFixed(5)));
    setLongitude(Number(pick.longitude.toFixed(5)));
    setLocationPinned(true);
    setLocationSource("manual");
    setGpsAccuracy(null);
    if (pick.label) {
      const short = pick.label.split(",").slice(0, 3).join(",").trim();
      setAddress(short);
      setRoadName(pick.label.split(",")[0]?.trim() ?? "");
      const match =
        wards.find((w) =>
          pick.label!.toLowerCase().includes(w.name.toLowerCase())
        ) ?? nearestWard(pick.latitude, pick.longitude, wards);
      if (match) {
        setWardName(match.name);
      }
    } else {
      const match = nearestWard(pick.latitude, pick.longitude, wards);
      if (match) setWardName(match.name);
      reverseGeocode(pick.latitude, pick.longitude);
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

    const evidenceRisk = previews.find(
      (p) =>
        p.scan.imageRelevant === "not_relevant" ||
        p.scan.imageOrigin === "possibly_ai_generated"
    );
    if (evidenceRisk) {
      const proceed = window.confirm(
        "This photo looks unrelated or possibly AI-generated. AMC may reject or deprioritize the ticket. Submit anyway?"
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const ward = wards.find((w) => w.name === wardName);
      const imageUrls = previews.slice(0, 3).map((p) => p.dataUrl);
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
          priority,
          imageUrl: imageUrls[0],
          imageUrls: imageUrls.length ? imageUrls : undefined,
          visualSignals: previews[0]?.signals,
          runAi: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { report: InfrastructureReport };
      };
      if (!res.ok || !json.success || !json.data?.report?.id) {
        throw new Error(json.message || "Submission failed");
      }
      const created = json.data.report;
      cacheReport(created);
      toast.success("Report submitted — AMC will review and update status");
      router.push(`/citizen/reports/${created.id}`);
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
        description="Upload photos for any ward in Ahmedabad — your home ward does not matter. The selected issue ward’s AMC desk receives the ticket with AI triage."
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
                  Capture the real defect on site. Selfies, memes, stock art, and
                  AI-generated images are flagged and lower authenticity for AMC.
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
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {previews.map((file) => {
                      const bad =
                        file.scan.imageRelevant === "not_relevant" ||
                        file.scan.imageOrigin === "possibly_ai_generated";
                      const watch =
                        file.scan.imageRelevant === "uncertain" ||
                        file.scan.imageOrigin === "uncertain";
                      return (
                        <div
                          key={file.id}
                          className={`group relative overflow-hidden rounded-2xl border ${
                            bad
                              ? "border-rose-400 ring-1 ring-rose-300/60"
                              : watch
                                ? "border-amber-300"
                                : "border-[var(--border)]"
                          }`}
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
                              setPreviews((prev) =>
                                prev.filter((p) => p.id !== file.id)
                              )
                            }
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white opacity-90 transition hover:bg-rose-600"
                            aria-label={`Remove ${file.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="space-y-1 bg-slate-950/70 px-2 py-1.5">
                            <p className="truncate text-[10px] text-white">
                              {file.name}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <Badge
                                tone={
                                  file.scan.imageRelevant === "relevant"
                                    ? "success"
                                    : file.scan.imageRelevant === "not_relevant"
                                      ? "danger"
                                      : "warning"
                                }
                                className="normal-case"
                              >
                                {file.scan.imageRelevant.replace("_", " ")}
                              </Badge>
                              <Badge
                                tone={
                                  file.scan.imageOrigin === "likely_photo"
                                    ? "brand"
                                    : file.scan.imageOrigin ===
                                        "possibly_ai_generated"
                                      ? "danger"
                                      : "warning"
                                }
                                className="normal-case"
                              >
                                {file.scan.imageOrigin === "possibly_ai_generated"
                                  ? "AI suspicion"
                                  : file.scan.imageOrigin === "likely_photo"
                                    ? "Likely photo"
                                    : "Origin unsure"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {previews.some((p) => p.scan.imageWarnings.length) ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      <p className="font-semibold">Evidence check</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                        {Array.from(
                          new Set(
                            previews.flatMap((p) => p.scan.imageWarnings)
                          )
                        )
                          .slice(0, 5)
                          .map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
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
                  <Label htmlFor="ward">Issue ward (any Ahmedabad ward)</Label>
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
                  <p className="text-xs text-[var(--muted)]">
                    Your home ward does not limit this — pick the ward where the
                    problem is. That ward&apos;s AMC desk receives the ticket.
                  </p>
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
                    Live GPS fills your pin as you stand at the issue. You can
                    also search or tap the map. Reports need a confirmed location.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {followLive || locationSource === "gps" ? (
                    <Badge tone="brand">
                      <Navigation className="mr-1 h-3 w-3" />
                      {followLive ? "Live GPS" : "GPS pin"}
                    </Badge>
                  ) : null}
                  <Badge tone={locationPinned ? "success" : "warning"}>
                    {locationPinned ? "Location confirmed" : "Pin required"}
                  </Badge>
                </div>
              </div>

              {gps.error ? (
                <p className="rounded-2xl border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  {gps.error}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
                    GPS accuracy
                  </p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {gpsAccuracy != null ? `±${Math.round(gpsAccuracy)} m` : "—"}
                  </p>
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
                    {roadName || (followLive ? "Resolving…" : "Select from search")}
                  </p>
                </div>
                <div className="surface-card p-3">
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
                  accuracyMeters={gpsAccuracy}
                  liveTracking={followLive}
                  liveLocating={gps.locating}
                  onUseMyLocation={() => {
                    setFollowLive(false);
                    gps.stopTracking();
                    setAwaitingGpsOnce(true);
                    gps.locateOnce();
                  }}
                  onToggleLive={() => {
                    if (followLive) {
                      setFollowLive(false);
                      gps.stopTracking();
                      toast.message("Live GPS paused — pin stays where it is");
                    } else {
                      setFollowLive(true);
                      gps.startTracking();
                      toast.success("Following your live GPS");
                    }
                  }}
                />
              </div>

              {!locationPinned ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Allow location access, search a place, or tap the map before submitting.
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
          <div className="glass-card space-y-3 p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Submit checklist
            </p>
            <ul className="space-y-2 text-xs text-[var(--muted)]">
              <li className={title.trim().length >= 4 ? "text-emerald-600" : ""}>
                {title.trim().length >= 4 ? "✓" : "○"} Issue title & details
              </li>
              <li className={locationPinned ? "text-emerald-600" : ""}>
                {locationPinned ? "✓" : "○"} Map location pinned
                {locationSource === "gps"
                  ? " (GPS)"
                  : locationSource === "manual"
                    ? " (manual)"
                    : ""}
              </li>
              <li className={address.trim().length >= 4 ? "text-emerald-600" : ""}>
                {address.trim().length >= 4 ? "✓" : "○"} Landmark / address
              </li>
            </ul>
            <p className="text-xs text-[var(--muted)]">
              After you submit, AMC systems run Exa authenticity and priority
              scoring automatically in the backend. Citizens do not manage AMC
              triage actions here.
            </p>
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
                  : "Submit report to AMC"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
