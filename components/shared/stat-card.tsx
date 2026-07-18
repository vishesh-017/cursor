import { cn } from "@/utils/cn";

export function StatCard({
  label,
  value,
  hint,
  className,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
  tone?: "default" | "danger" | "warning" | "brand";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5",
        tone === "danger" &&
          "border-rose-300/40 bg-rose-500/10 dark:border-rose-500/30",
        tone === "warning" &&
          "border-amber-300/40 bg-amber-500/10 dark:border-amber-500/30",
        tone === "brand" &&
          "border-[var(--brand)]/30 bg-[var(--brand-soft)]",
        tone === "default" &&
          "border-[var(--border)] bg-[var(--surface-solid)]",
        className
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.12em]",
          tone === "danger" && "text-rose-700 dark:text-rose-300",
          tone === "warning" && "text-amber-800 dark:text-amber-200",
          tone === "brand" && "text-[var(--brand)]",
          tone === "default" && "text-[var(--muted)]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
          tone === "danger" && "text-rose-700 dark:text-rose-100",
          tone === "warning" && "text-amber-900 dark:text-amber-50",
          tone === "brand" && "text-[var(--brand-strong)] dark:text-teal-50",
          tone === "default" && "text-[var(--foreground)]"
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
