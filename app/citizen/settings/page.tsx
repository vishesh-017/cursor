"use client";

import { useEffect, useState } from "react";
import { Bell, Lock, Smartphone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionUser, UserProfile } from "@/types";

export default function CitizenSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [wardDigest, setWardDigest] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          data?: { user: SessionUser; profile?: UserProfile };
        };
        if (res.ok && json.success && json.data?.profile) {
          setProfile(json.data.profile);
          setPhone(json.data.profile.phone);
          setDisplayName(json.data.profile.name);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function savePreferences() {
    toast.success("Preferences saved for your Ahmedabad civic account");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3 rounded-[18px]" />
        <Skeleton className="h-48 w-full rounded-[18px]" />
        <Skeleton className="h-48 w-full rounded-[18px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account controls"
        title="Settings"
        description="Manage contact preferences and alert channels for AMC ticket updates across your ward."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <UserRound className="h-4 w-4" />
            <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
              Profile contact
            </h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Used for SMS acknowledgements when crews update your reports.
          </p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Home ward</Label>
              <Input id="ward" value={profile?.ward ?? ""} disabled />
            </div>
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Bell className="h-4 w-4" />
            <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
              Alert preferences
            </h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose how Urbanexus notifies you about acknowledgements and resolutions.
          </p>
          <div className="mt-5 space-y-3">
            {(
              [
                {
                  id: "email",
                  label: "Email alerts for status changes",
                  hint: "Includes acknowledge, assign, and resolve events",
                  checked: emailAlerts,
                  set: setEmailAlerts,
                },
                {
                  id: "sms",
                  label: "SMS for critical and high priority tickets",
                  hint: "Recommended during monsoon peak weeks",
                  checked: smsAlerts,
                  set: setSmsAlerts,
                },
                {
                  id: "digest",
                  label: "Weekly ward infrastructure digest",
                  hint: "Vastrapur / citywide hotspot summary",
                  checked: wardDigest,
                  set: setWardDigest,
                },
                {
                  id: "critical",
                  label: "Critical-only push quiet hours",
                  hint: "Mute medium/low after 10 PM IST",
                  checked: criticalOnly,
                  set: setCriticalOnly,
                },
              ] as const
            ).map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/50 px-4 py-3 dark:bg-white/5"
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

        <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Smartphone className="h-4 w-4" />
            <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
              Channel defaults
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="surface-card p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                Preferred language
              </p>
              <p className="mt-2 text-sm font-semibold">English · Gujarati labels</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                Timezone
              </p>
              <p className="mt-2 text-sm font-semibold">Asia/Kolkata (IST)</p>
            </div>
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Lock className="h-4 w-4" />
            <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
              Privacy & session
            </h2>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Demo accounts keep credentials local to this Urbanexus session. Production
            AMC SSO would bind to municipal identity.
          </p>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/40 p-4 text-sm dark:bg-white/5">
            <p className="font-semibold">Citizen ID</p>
            <p className="mt-1 text-[var(--muted)]">{profile?.id ?? "—"}</p>
          </div>
          <Button className="mt-5" onClick={savePreferences}>
            Save preferences
          </Button>
        </section>
      </div>
    </div>
  );
}
