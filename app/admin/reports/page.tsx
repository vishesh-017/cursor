"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportTable } from "@/components/shared/report-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Department,
  InfrastructureReport,
  Priority,
  ReportStatus,
  Ward,
} from "@/types";

const statuses: Array<ReportStatus | ""> = [
  "",
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
];

const priorities: Array<Priority | ""> = ["", "low", "medium", "high", "critical"];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [ward, setWard] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (ward) params.set("ward", ward);
    if (departmentId) params.set("departmentId", departmentId);
    return params.toString();
  }, [q, status, priority, ward, departmentId]);

  useEffect(() => {
    void (async () => {
      const metaRes = await fetch("/api/meta", { cache: "no-store" });
      const metaJson = (await metaRes.json()) as {
        success: boolean;
        data?: { wards: Ward[]; departments: Department[] };
      };
      if (metaRes.ok && metaJson.success && metaJson.data) {
        setWards(metaJson.data.wards);
        setDepartments(metaJson.data.departments);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/reports${queryString ? `?${queryString}` : ""}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Failed to load reports");
        }
        if (active) setReports(json.data.reports);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [queryString]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Reports inbox
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Filter Ahmedabad infrastructure tickets by ward, department, priority, and status.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, address, ward, ticket id…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus | "")}
            >
              {statuses.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? s.replace("_", " ") : "All statuses"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | "")}
            >
              {priorities.map((p) => (
                <option key={p || "all"} value={p}>
                  {p || "All priorities"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ward">Ward</Label>
            <select
              id="ward"
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            >
              <option value="">All wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <Label htmlFor="dept">Department</Label>
            <select
              id="dept"
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setQ("");
                setStatus("");
                setPriority("");
                setWard("");
                setDepartmentId("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {error ? <EmptyState title="Unable to load reports" description={error} /> : null}

      {!loading && !error && reports.length === 0 ? (
        <EmptyState
          title="No reports match"
          description="Adjust filters or clear them to see the full AMC inbox."
        />
      ) : null}

      {!loading && !error && reports.length > 0 ? (
        <ReportTable reports={reports} hrefBase="/admin/reports" />
      ) : null}
    </div>
  );
}
