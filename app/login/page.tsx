"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MapPinned, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { UrbanexusLogo } from "@/components/brand/urbanexus-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionUser } from "@/types";

type LoginResponse = {
  success: boolean;
  message?: string;
  data?: { user: SessionUser };
};

const demos = [
  {
    role: "Citizen",
    email: "aarav.sharma@gmail.com",
    password: "demo1234",
    note: "Any ward reports · home Vastrapur",
  },
  {
    role: "City HQ",
    email: "admin@amc.gov.in",
    password: "admin1234",
    note: "Sees all ward tickets",
  },
  {
    role: "Thaltej desk",
    email: "thaltej.admin@amc.gov.in",
    password: "ward1234",
    note: "Only Thaltej ward inbox",
  },
  {
    role: "Maninagar desk",
    email: "maninagar.admin@amc.gov.in",
    password: "ward1234",
    note: "Only Maninagar ward inbox",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("aarav.sharma@gmail.com");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const payload = (await response.json()) as LoginResponse;
      if (!response.ok || !payload.success || !payload.data?.user) {
        throw new Error(payload.message || "Sign-in failed");
      }

      const user = payload.data.user;
      toast.success(`Welcome back, ${user.name}`);
      if (user.role === "citizen") {
        router.push("/citizen/dashboard");
      } else {
        router.push("/admin/dashboard");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1600&q=80"
            alt="Ahmedabad urban skyline"
            fill
            className="object-cover"
            priority
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-teal-950/50" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <div>
              <UrbanexusLogo inverted size="lg" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                Ahmedabad Municipal Corporation
              </p>
              <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
                Urbanexus
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
                Premium civic access for citizens and AMC officers — report SG Highway
                potholes, track monsoon drainage, and command ward operations.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                {
                  icon: MapPinned,
                  title: "Enterprise GIS",
                  body: "Ward boundaries, heatmaps, and issue clustering",
                },
                {
                  icon: ShieldCheck,
                  title: "Exa AI triage",
                  body: "Confidence-scored routing to municipal desks",
                },
                {
                  icon: Building2,
                  title: "AMC command center",
                  body: "Urban Pulse, priority queues, department load",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <item.icon className="mt-0.5 h-5 w-5 text-teal-300" />
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md space-y-6">
            <div className="lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">
                Ahmedabad Municipal Corporation
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold">Urbanexus</h1>
            </div>

            <div className="glass-card p-6 shadow-[var(--shadow)] sm:p-8">
              <h2 className="font-display text-2xl font-semibold">Secure access</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Use demo credentials below or enter your AMC / citizen account.
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void signIn(email, password);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {demos.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword(demo.password);
                      void signIn(demo.email, demo.password);
                    }}
                    className="rounded-2xl border border-[var(--border)] bg-white/50 p-4 text-left transition hover:border-[var(--brand)] dark:bg-white/5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">
                      {demo.role}
                    </p>
                    <p className="mt-2 text-xs font-semibold">{demo.email}</p>
                    <p className="text-xs text-[var(--muted)]">{demo.password}</p>
                    <p className="mt-2 text-[11px] text-[var(--muted)]">{demo.note}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                Other ward desks:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  vastrapur.admin@amc.gov.in
                </span>
                ,{" "}
                <span className="font-medium text-[var(--foreground)]">
                  ellisbridge.admin@amc.gov.in
                </span>
                , … — password{" "}
                <span className="font-medium text-[var(--foreground)]">ward1234</span>
              </p>
            </div>

            <p className="text-center text-xs text-[var(--muted)]">
              New to the portal?{" "}
              <Link href="/" className="font-semibold text-[var(--brand)] hover:underline">
                Explore Urbanexus
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
