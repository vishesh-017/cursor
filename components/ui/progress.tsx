import { cn } from "@/utils/cn";

export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "accent" | "success" | "warning" | "danger";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const tones = {
    brand: "bg-[var(--brand)]",
    accent: "bg-[var(--accent)]",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  };

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10",
        className
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ConfidenceMeter({
  value,
  label = "Confidence",
}: {
  value: number;
  label?: string;
}) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 85 ? "success" : pct >= 70 ? "brand" : pct >= 55 ? "warning" : "danger";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} tone={tone} />
    </div>
  );
}
