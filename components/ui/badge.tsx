import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

const tones = {
  default: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  brand: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200",
  accent: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
} as const;

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

export function priorityTone(priority: string) {
  if (priority === "critical") return "danger" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "info" as const;
  return "default" as const;
}

export function statusTone(status: string) {
  if (status === "resolved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "in_progress" || status === "assigned") return "brand" as const;
  return "warning" as const;
}
