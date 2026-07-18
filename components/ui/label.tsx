import { cn } from "@/utils/cn";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]",
        className
      )}
      {...props}
    />
  );
}
