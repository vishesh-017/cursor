"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, Database, HardDrive } from "lucide-react";

type DbStatus = {
  mode: "local" | "supabase";
  synced: boolean;
  reportCount: number | null;
  message: string;
};

export function StorageModeBanner({ showSetupLink = true }: { showSetupLink?: boolean }) {
  const [status, setStatus] = useState<DbStatus | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/db/status", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          data?: DbStatus;
        };
        if (active && json.success && json.data) setStatus(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  if (status.synced) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
        <Cloud className="h-4 w-4 shrink-0" />
        <span className="font-medium">Shared database</span>
        <span className="text-teal-800/80">
          — {status.reportCount ?? 0} reports in cloud. Other laptops with the same
          Supabase keys see the same data.
        </span>
        {showSetupLink ? (
          <Link
            href="/admin/database"
            className="ml-auto font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            Database
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
      <HardDrive className="h-4 w-4 shrink-0" />
      <span className="font-medium">Local-only mode</span>
      <span className="text-amber-900/80">
        — reports on this laptop will not appear on another device until you connect
        Supabase.
      </span>
      {showSetupLink ? (
        <Link
          href="/admin/database"
          className="ml-auto inline-flex items-center gap-1 font-semibold text-amber-950 underline-offset-2 hover:underline"
        >
          <Database className="h-3.5 w-3.5" />
          Fix sync
        </Link>
      ) : null}
    </div>
  );
}
