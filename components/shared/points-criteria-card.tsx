"use client";

import { Award } from "lucide-react";
import {
  getPointsCriteriaRows,
  POINTS_POLICY,
} from "@/lib/points/criteria";

export function PointsCriteriaCard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const rows = getPointsCriteriaRows();

  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-solid)] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-500/10 text-teal-800 dark:text-teal-200">
          <Award className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
            Civic points criteria
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-[var(--foreground)]">
            How you earn points
          </h3>
          {!compact ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Points credit to your balance when a report enters the AMC queue,
              with bonuses for real site photos and resolved tickets. Fake or
              rejected reports do not keep points.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              <th className="pb-2 pr-3 font-semibold">Event</th>
              <th className="pb-2 pr-3 font-semibold">Criteria</th>
              <th className="pb-2 font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.event}-${row.criteria}`}
                className="border-t border-[var(--border)]"
              >
                <td className="py-2.5 pr-3 font-medium text-[var(--foreground)]">
                  {row.event}
                </td>
                <td className="py-2.5 pr-3 text-[var(--muted)]">{row.criteria}</td>
                <td className="py-2.5 font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[var(--muted)]">
        Quick ref: Critical {POINTS_POLICY.submitByPriority.critical} · High{" "}
        {POINTS_POLICY.submitByPriority.high} · Medium{" "}
        {POINTS_POLICY.submitByPriority.medium} · Low{" "}
        {POINTS_POLICY.submitByPriority.low} · Photo +
        {POINTS_POLICY.photoRelevantBonus} · Resolve +
        {POINTS_POLICY.resolveBonus}
      </p>
    </div>
  );
}
