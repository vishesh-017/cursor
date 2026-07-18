import { cn } from "@/utils/cn";

const tones: Record<string, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  info: "bg-sky-100 text-sky-800",
  brand: "bg-teal-100 text-teal-800",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
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
