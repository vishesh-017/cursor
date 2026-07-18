"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Lock, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionUser, UserProfile } from "@/types";

export default function AdminSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [queueAlerts, setQueueAlerts] = useState(true);
  const [criticalPush, setCriticalPush] = useState(true);
  const [digest, setDigest] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        if (res.ok && json.success && json.data) {
          setUser(json.data.user);
          setProfile(json.data.profile ?? null);
          setPhone(json.data.profile?.phone ?? "");
          setDisplayName(json.data.profile?.name ?? json.data.user.name);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function save() {
    toast.success("AMC desk preferences saved for this session");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3 rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Desk controls"
        title="Settings"
        description="Contact details and alert preferences for your AMC operations desk."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <UserRound className="h-4 w-4" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Desk contact
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Official email</Label>
              <Input id="email" value={user?.email ?? profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Duty phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Desk ward</Label>
              <Input id="ward" value={user?.ward ?? ""} disabled />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Bell className="h-4 w-4" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Ops alerts
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {(
              [
                {
                  label: "New ticket in desk inbox",
                  hint: "Notify when citizens file into your ward scope",
                  checked: queueAlerts,
                  set: setQueueAlerts,
                },
                {
                  label: "Critical / AI high-score push",
                  hint: "Immediate alert when triage score spikes",
                  checked: criticalPush,
                  set: setCriticalPush,
                },
                {
                  label: "Evening desk digest",
                  hint: "Open backlog summary at 6 PM IST",
                  checked: digest,
                  set: setDigest,
                },
              ] as const
            ).map((item) => (
              <label
                key={item.label}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span>
                  <span className="block text-sm font-medium text-[var(--foreground)]">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {item.hint}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--brand)]"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Shield className="h-4 w-4" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Access
            </h2>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Scope:{" "}
            <strong className="text-[var(--foreground)]">
              {user?.adminScope === "city" ? "City HQ" : "Ward desk"}
            </strong>
            {user?.managedWards?.length
              ? ` · ${user.managedWards.join(", ")}`
              : user?.ward
                ? ` · ${user.ward}`
                : ""}
          </p>
          <Link
            href="/admin/profile"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            View full officer profile →
          </Link>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Lock className="h-4 w-4" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Session
            </h2>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Demo desk login is cookie-based. Production AMC SSO would replace this.
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Officer ID: {user?.id ?? "—"}
          </p>
          <Button className="mt-5" onClick={save}>
            Save preferences
          </Button>
        </section>
      </div>
    </div>
  );
}
