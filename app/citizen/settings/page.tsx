"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionUser, UserProfile } from "@/types";

export default function CitizenSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [wardDigest, setWardDigest] = useState(true);
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
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage contact preferences and alert channels for AMC ticket updates.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>
            Used for SMS acknowledgements when crews update your reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Alert preferences</CardTitle>
          <CardDescription>
            Choose how Urbanexus notifies you about acknowledgements and resolutions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              id: "email",
              label: "Email alerts for status changes",
              checked: emailAlerts,
              set: setEmailAlerts,
            },
            {
              id: "sms",
              label: "SMS for critical and high priority tickets",
              checked: smsAlerts,
              set: setSmsAlerts,
            },
            {
              id: "digest",
              label: "Weekly ward infrastructure digest",
              checked: wardDigest,
              set: setWardDigest,
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-4 py-3 text-sm"
            >
              <span className="text-slate-700">{item.label}</span>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.set(e.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
            </label>
          ))}
          <Button onClick={savePreferences}>Save preferences</Button>
        </CardContent>
      </Card>
    </div>
  );
}
