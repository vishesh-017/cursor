import Link from "next/link";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import type { InfrastructureReport } from "@/types";

export function ReportTable({
  reports,
  hrefBase,
}: {
  reports: InfrastructureReport[];
  hrefBase: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-black/[0.03] text-xs uppercase tracking-[0.14em] text-[var(--muted)] dark:bg-white/[0.04]">
          <tr>
            <th className="px-4 py-3.5 font-semibold">Report</th>
            <th className="px-4 py-3.5 font-semibold">Ward</th>
            <th className="px-4 py-3.5 font-semibold">Priority</th>
            <th className="px-4 py-3.5 font-semibold">Status</th>
            <th className="px-4 py-3.5 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className="border-t border-[var(--border)] transition hover:bg-[var(--brand-soft)]/40"
            >
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
                  {report.status.replace("_", " ")}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
