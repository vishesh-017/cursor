"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
  delay = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "kpi-glow glass-card relative p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.12)]",
        className
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p> : null}
          {trend ? (
            <p className="mt-2 text-xs font-medium text-[var(--brand)]">{trend}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
