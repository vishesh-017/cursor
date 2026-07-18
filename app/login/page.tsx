"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    note: "Vastrapur · civic reporter",
  },
  {
    role: "Admin",
    email: "admin@amc.gov.in",
    password: "admin1234",
    note: "AMC control room",
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
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-slate-400/20 blur-3xl" />
      </div>

      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Ahmedabad Municipal Corporation
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Sign in to Urbanexus
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-600">
            Report potholes on SG Highway, track monsoon drainage tickets in
            Maninagar, and help AMC crews prioritize ward-level infrastructure
            work across Ahmedabad.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {demos.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                  void signIn(demo.email, demo.password);
                }}
                className="glass-card rounded-xl p-4 text-left transition hover:border-teal-300 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  {demo.role} demo
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{demo.email}</p>
                <p className="text-sm text-slate-500">{demo.password}</p>
                <p className="mt-2 text-xs text-slate-500">{demo.note}</p>
              </button>
            ))}
          </div>
        </section>

        <Card className="glass-card border-slate-200/80 shadow-xl">
          <CardHeader>
            <CardTitle>Secure access</CardTitle>
            <CardDescription>
              Use demo credentials below or enter your AMC / citizen account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Demo credentials</p>
              <p className="mt-2">
                Citizen: aarav.sharma@gmail.com / demo1234
              </p>
              <p>Admin: admin@amc.gov.in / admin1234</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
