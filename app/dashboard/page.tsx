"use client";

import { StatsCharts } from "@/components/dashboard/stats-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReports } from "@/hooks/use-reports";

export default function DashboardPage() {
  const { data, loading, error } = useReports(true);
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          AMC operations dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Triage volume, criticality, and ward hotspots for Ahmedabad infrastructure.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading dashboard…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total reports", value: stats.totalReports },
              { label: "Open", value: stats.openReports },
              { label: "Resolved", value: stats.resolvedReports },
              { label: "Critical", value: stats.criticalReports },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-slate-900">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <StatsCharts stats={stats} />

          <Card>
            <CardHeader>
              <CardTitle>Recent reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.reports.slice(0, 6).map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{report.title}</p>
                    <p className="text-sm text-slate-500">
                      {report.ward} · {report.category} · {report.status}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {report.priority}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
