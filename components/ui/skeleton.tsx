import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]",
        className
      )}
      {...props}
    />
  );
}
