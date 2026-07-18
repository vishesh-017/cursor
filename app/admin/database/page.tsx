"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import { StorageModeBanner } from "@/components/shared/storage-mode-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type StatusData = {
  mode: "local" | "supabase";
  synced: boolean;
  configured: boolean;
  connected?: boolean;
  reportCount: number | null;
  userCount: number | null;
  message: string;
  error?: string;
  env: {
    exa: boolean;
    supabaseUrl: boolean;
    supabaseAnon: boolean;
    supabaseService: boolean;
    database: boolean;
  };
};

const ENV_SNIPPET = `# Shared cloud DB — paste the SAME three values on every laptop
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
# (Legacy JWT anon + service_role keys also work)`;

export default function AdminDatabasePage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/status", { cache: "no-store" });
      const json = (await res.json()) as {
        success: boolean;
        data?: StatusData;
        message?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Could not read database status");
      }
      setStatus(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function seed(force = false) {
    setSeeding(true);
    try {
      const res = await fetch("/api/db/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { message?: string; seeded?: boolean };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Seed failed");
      }
      toast.success(json.data?.message || json.message || "Seed complete");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  function copySnippet() {
    void navigator.clipboard.writeText(ENV_SNIPPET);
    toast.success("Copied .env template");
  }

  const synced = Boolean(status?.synced);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Multi-device sync
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Shared database
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Right now each laptop can keep its own local copy. Connect one free Supabase
          project so a report filed here shows up on every other machine using the same
          keys.
        </p>
      </header>

      <StorageModeBanner showSetupLink={false} />

      <section
        className={cn(
          "rounded-3xl border p-5",
          synced
            ? "border-teal-200 bg-teal-50/60"
            : "border-[var(--border)] bg-[var(--surface-solid)]"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl",
                synced ? "bg-teal-600 text-white" : "bg-amber-100 text-amber-900"
              )}
            >
              {synced ? (
                <Cloud className="h-5 w-5" />
              ) : (
                <HardDrive className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {synced ? "Cloud sync on" : "Still local-only"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {status?.message ?? (loading ? "Checking…" : "—")}
              </p>
              {status?.error ? (
                <p className="mt-2 text-sm text-rose-700">{status.error}</p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Mode"
            value={status?.mode === "supabase" ? "Supabase" : "Local memory"}
          />
          <Stat
            label="Users in DB"
            value={
              status?.userCount == null ? "—" : String(status.userCount)
            }
          />
          <Stat
            label="Reports in DB"
            value={
              status?.reportCount == null ? "—" : String(status.reportCount)
            }
          />
        </dl>

        <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <EnvChip ok={status?.env.supabaseUrl} label="SUPABASE_URL" />
          <EnvChip ok={status?.env.supabaseAnon} label="ANON_KEY" />
          <EnvChip ok={status?.env.supabaseService} label="SERVICE_ROLE" />
        </ul>
      </section>

      <section className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">Setup (about 5 minutes)</h2>
        </div>

        <ol className="space-y-4 text-sm leading-relaxed text-[var(--muted)]">
          <li className="flex gap-3">
            <Step n={1} />
            <div>
              <p className="font-medium text-[var(--foreground)]">
                Create a free Supabase project
              </p>
              <p className="mt-1">
                Open{" "}
                <a
                  href="https://supabase.com/dashboard/project/kgsmdprurziemjmkouha/settings/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  Project Settings → API Keys
                </a>
                . Copy Project URL,{" "}
                <span className="font-medium text-[var(--foreground)]">
                  publishable
                </span>{" "}
                key (`sb_publishable_…`), and{" "}
                <span className="font-medium text-[var(--foreground)]">
                  secret
                </span>{" "}
                key (`sb_secret_…` or legacy service_role). The Postgres
                connection string password is not used by this app.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <div>
              <p className="font-medium text-[var(--foreground)]">
                Put the same keys in every laptop
              </p>
              <p className="mt-1">
                Edit <code className="rounded bg-black/5 px-1.5 py-0.5">.env.local</code>{" "}
                on this machine and the other laptop. Restart{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5">npm run dev</code>{" "}
                after saving.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#0f172a] p-4 text-xs text-slate-100">
                {ENV_SNIPPET}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={copySnippet}
              >
                <Copy className="h-4 w-4" />
                Copy template
              </Button>
            </div>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <div>
              <p className="font-medium text-[var(--foreground)]">
                Run the SQL schema once
              </p>
              <p className="mt-1">
                Open the{" "}
                <a
                  href="https://supabase.com/dashboard/project/kgsmdprurziemjmkouha/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  SQL Editor
                </a>
                , paste all of{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5">
                  supabase/setup_all.sql
                </code>
                , and click Run. (Direct DB from this laptop is IPv6-only, so
                SQL Editor is the reliable path.)
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Step n={4} />
            <div>
              <p className="font-medium text-[var(--foreground)]">
                Seed demo accounts & sample reports
              </p>
              <p className="mt-1">
                After keys + SQL are in place, click Seed below. Then file a new report
                on laptop A — laptop B should see it within a few seconds (live poll).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void seed(false)}
                  disabled={seeding || !status?.configured}
                >
                  {seeding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sprout className="h-4 w-4" />
                  )}
                  Seed demo data
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void seed(true)}
                  disabled={seeding || !status?.configured}
                >
                  Force re-seed
                </Button>
              </div>
              {!status?.configured ? (
                <p className="mt-2 text-xs text-amber-800">
                  Seed stays disabled until all three Supabase env vars are set and the
                  server is restarted.
                </p>
              ) : null}
            </div>
          </li>
        </ol>
      </section>

      {synced ? (
        <div className="flex items-start gap-3 rounded-3xl border border-teal-200 bg-white/70 p-4 text-sm text-teal-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Both laptops should use the <strong>same three keys</strong>. They can each
            run <code className="rounded bg-teal-100 px-1">npm run dev</code> locally,
            or you can deploy once to Vercel with those env vars and open the same URL
            on both machines.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-xs font-bold text-white">
      {n}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

function EnvChip({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2 font-medium",
        ok
          ? "border-teal-200 bg-teal-50 text-teal-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      )}
    >
      {ok ? "✓" : "○"} {label}
    </li>
  );
}
