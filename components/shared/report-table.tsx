import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import type { InfrastructureReport, ReportStatus } from "@/types";
import { aiQueueScore } from "@/utils/ai-priority";
import { cn } from "@/utils/cn";
import { statusLabel } from "@/utils/status";

const quickStatuses: ReportStatus[] = [
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
];

export function ReportTable({
  reports,
  hrefBase,
  adminActions = false,
  showAiScore = false,
  dense = false,
  updatingId = null,
  onStatusChange,
}: {
  reports: InfrastructureReport[];
  hrefBase: string;
  adminActions?: boolean;
  showAiScore?: boolean;
  dense?: boolean;
  updatingId?: string | null;
  onStatusChange?: (id: string, status: ReportStatus) => void;
}) {
  const cell = dense ? "px-3 py-2.5" : "px-4 py-3.5";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-solid)] text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              {showAiScore ? (
                <th className={cn(cell, "font-semibold")}>AI</th>
              ) : null}
              <th className={cn(cell, "font-semibold")}>Photo</th>
              <th className={cn(cell, "font-semibold")}>Report</th>
              <th className={cn(cell, "font-semibold")}>Ward</th>
              <th className={cn(cell, "font-semibold")}>Priority</th>
              <th className={cn(cell, "font-semibold")}>Status</th>
              <th className={cn(cell, "font-semibold")}>Updated</th>
              {adminActions ? (
                <th className={cn(cell, "font-semibold")}>Update</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {reports.map((report, index) => {
              const score = aiQueueScore(report);
              const topRank = showAiScore && index < 3;
              return (
                <tr
                  key={report.id}
                  className={cn(
                    "border-t border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]/40",
                    topRank && index === 0 && "bg-teal-500/[0.06]"
                  )}
                >
                  {showAiScore ? (
                    <td className={cell}>
                      <div
                        className={cn(
                          "inline-flex min-w-[3.25rem] flex-col rounded-lg px-2 py-1",
                          topRank
                            ? "bg-[var(--brand-soft)]"
                            : "bg-transparent"
                        )}
                      >
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold tabular-nums text-[var(--brand)]">
                          {index < 3 ? (
                            <Sparkles className="h-3 w-3" />
                          ) : null}
                          #{index + 1}
                        </span>
                        <span className="text-[10px] tabular-nums text-[var(--muted)]">
                          {Math.round(score)}
                        </span>
                      </div>
                    </td>
                  ) : null}
                  <td className={cell}>
                    {report.imageUrl || report.imageUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={report.imageUrl || report.imageUrls?.[0]}
                        alt=""
                        className={cn(
                          "rounded-lg object-cover ring-1 ring-[var(--border)]",
                          dense ? "h-10 w-14" : "h-12 w-16 rounded-xl"
                        )}
                      />
                    ) : (
                      <span
                        className={cn(
                          "grid place-items-center rounded-lg bg-black/5 text-[10px] text-[var(--muted)] dark:bg-white/5",
                          dense ? "h-10 w-14" : "h-12 w-16 rounded-xl"
                        )}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td className={cn(cell, "max-w-[16rem]")}>
                    <Link
                      href={`${hrefBase}/${report.id}`}
                      className="font-semibold text-[var(--brand)] hover:underline"
                    >
                      <span className="line-clamp-1">{report.title}</span>
                    </Link>
                    <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted)]">
                      {report.id}
                    </p>
                    {showAiScore && report.ai?.issueDetected ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)]">
                        {report.ai.issueDetected}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(cell, "text-[var(--muted)]")}>
                    {report.ward}
                  </td>
                  <td className={cell}>
                    <Badge tone={priorityTone(report.priority)}>
                      {report.priority}
                    </Badge>
                    {showAiScore &&
                    report.ai?.suggestedPriority &&
                    report.ai.suggestedPriority !== report.priority ? (
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        AI {report.ai.suggestedPriority}
                      </p>
                    ) : null}
                  </td>
                  <td className={cell}>
                    <Badge tone={statusTone(report.status)}>
                      {statusLabel(report.status)}
                    </Badge>
                  </td>
                  <td className={cn(cell, "whitespace-nowrap text-[var(--muted)]")}>
                    {new Date(report.updatedAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  {adminActions ? (
                    <td className={cell}>
                      <select
                        aria-label={`Update status for ${report.id}`}
                        className="h-8 min-w-[9.5rem] rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] px-2 text-xs font-semibold text-[var(--foreground)]"
                        value={report.status}
                        disabled={updatingId === report.id}
                        onChange={(e) =>
                          onStatusChange?.(
                            report.id,
                            e.target.value as ReportStatus
                          )
                        }
                      >
                        <option value="submitted">
                          {statusLabel("submitted")}
                        </option>
                        {quickStatuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
