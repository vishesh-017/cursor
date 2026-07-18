"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResearchResult } from "@/types";

export function ResearchPanel() {
  const [topic, setTopic] = useState("monsoon drainage readiness");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);

  async function runResearch() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: ResearchResult;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || payload.error || "Research failed");
      }

      setResult(payload.data);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run Exa research right now"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exa urban research</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. BRTS last-mile connectivity gaps"
          />
          <Button onClick={runResearch} disabled={loading || topic.trim().length < 3}>
            {loading ? "Researching…" : "Run Exa"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Intelligence brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {result.answer}
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sources
              </p>
              <ul className="space-y-2">
                {result.sources.map((source) => (
                  <li key={source.url} className="text-sm">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
