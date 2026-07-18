"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportTable } from "@/components/shared/report-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, SessionUser } from "@/types";

export default function CitizenReportsPage() {
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meJson = (await meRes.json()) as {
          success: boolean;
          data?: { user: SessionUser };
          message?: string;
        };
        if (!meRes.ok || !meJson.success || !meJson.data) {
          throw new Error(meJson.message || "Sign in required");
        }

        const params = new URLSearchParams({
          citizenId: meJson.data.user.id,
        });
        if (query.trim()) params.set("q", query.trim());

        const res = await fetch(`/api/reports?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
          message?: string;
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
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            My reports
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Every infrastructure ticket you filed with AMC — from CG Road lighting
            to Vastrapur water pressure.
          </p>
        </div>
        <Link href="/citizen/reports/new">
          <Button>New report</Button>
        </Link>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Filter reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, ward, or address…"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}

      {error ? (
        <EmptyState title="Unable to load reports" description={error} />
      ) : null}

      {!loading && !error && reports.length === 0 ? (
        <EmptyState
          title="No matching reports"
          description="Try a different search, or submit a new civic issue from your ward."
          action={
            <Link href="/citizen/reports/new">
              <Button>Report an issue</Button>
            </Link>
          }
        />
      ) : null}

      {!loading && !error && reports.length > 0 ? (
        <ReportTable reports={reports} hrefBase="/citizen/reports" />
      ) : null}
    </div>
  );
}
