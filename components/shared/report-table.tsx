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
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Report</th>
            <th className="px-4 py-3">Ward</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-t border-slate-100 hover:bg-slate-50/80">
              <td className="px-4 py-3">
                <Link
                  href={`${hrefBase}/${report.id}`}
                  className="font-medium text-teal-800 hover:underline"
                >
                  {report.title}
                </Link>
                <p className="text-xs text-slate-500">{report.id}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{report.ward}</td>
              <td className="px-4 py-3">
                <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(report.status)}>
                  {report.status.replace("_", " ")}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-500">
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
