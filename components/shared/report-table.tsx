import Link from "next/link";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import type { InfrastructureReport, ReportStatus } from "@/types";
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
  updatingId = null,
  onStatusChange,
}: {
  reports: InfrastructureReport[];
  hrefBase: string;
  adminActions?: boolean;
  updatingId?: string | null;
  onStatusChange?: (id: string, status: ReportStatus) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow)]">
      <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--brand-soft)]/50 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3.5 font-semibold">Photo</th>
            <th className="px-4 py-3.5 font-semibold">Report</th>
            <th className="px-4 py-3.5 font-semibold">Ward</th>
            <th className="px-4 py-3.5 font-semibold">Priority</th>
            <th className="px-4 py-3.5 font-semibold">Status</th>
            <th className="px-4 py-3.5 font-semibold">Updated</th>
            {adminActions ? (
              <th className="px-4 py-3.5 font-semibold">Update status</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className="border-t border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]/35"
            >
              <td className="px-4 py-3.5">
                {report.imageUrl || report.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.imageUrl || report.imageUrls?.[0]}
                    alt=""
                    className="h-12 w-16 rounded-xl object-cover ring-1 ring-[var(--border)]"
                  />
                ) : (
                  <span className="grid h-12 w-16 place-items-center rounded-xl bg-black/5 text-[10px] text-[var(--muted)] dark:bg-white/5">
                    None
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <Link
                  href={`${hrefBase}/${report.id}`}
                  className="font-semibold text-[var(--brand)] hover:underline"
                >
                  {report.title}
                </Link>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{report.id}</p>
              </td>
              <td className="px-4 py-3.5 text-[var(--muted)]">{report.ward}</td>
              <td className="px-4 py-3.5">
                <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
              </td>
              <td className="px-4 py-3.5">
                <Badge tone={statusTone(report.status)}>
                  {statusLabel(report.status)}
                </Badge>
              </td>
              <td className="px-4 py-3.5 text-[var(--muted)]">
                {new Date(report.updatedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              {adminActions ? (
                <td className="px-4 py-3.5">
                  <select
                    aria-label={`Update status for ${report.id}`}
                    className="h-9 min-w-[10.5rem] rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-2 text-xs font-semibold text-[var(--foreground)]"
                    value={report.status}
                    disabled={updatingId === report.id}
                    onChange={(e) =>
                      onStatusChange?.(report.id, e.target.value as ReportStatus)
                    }
                  >
                    <option value="submitted">{statusLabel("submitted")}</option>
                    {quickStatuses.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
