import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/utils/cn";

export function EmptyState({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center shadow-[var(--shadow)]",
        className
      )}
    >
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
        <Inbox className="h-5 w-5" />
      </span>
      <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
