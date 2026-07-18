"use client";

import {
  Camera,
  GitCompareArrows,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Authenticity check",
    body: "Exa scores whether a citizen report looks genuine, uncertain, or possibly fake before AMC dispatch.",
    usage: "Used on every new report submit and admin re-triage.",
  },
  {
    icon: TriangleAlert,
    title: "Risk & confidence",
    body: "Predicts Critical / High / Medium / Low risk with a model confidence score for queue weight.",
    usage: "Drives priority suggestions and AI vs actual comparison.",
  },
  {
    icon: Camera,
    title: "Photo evidence scan",
    body: "Reads visual signals from uploaded images to judge project relevance and issue type in frame.",
    usage: "Citizen uploads → AI relevance + department hint for ward desks.",
  },
  {
    icon: Route,
    title: "Department routing",
    body: "Maps potholes to Roads, waterlogging to Drainage, lighting to Electrical, and more.",
    usage: "Pre-fills AMC desk assignment; officers can still override.",
  },
  {
    icon: GitCompareArrows,
    title: "AI vs actual",
    body: "Side-by-side view of Exa prediction against the live ticket priority and department.",
    usage: "Admin report detail — apply AI or keep officer judgment.",
  },
  {
    icon: Search,
    title: "Exa research briefs",
    body: "Ahmedabad-focused infrastructure research with citations for monsoon, mobility, and utilities.",
    usage: "Intel / AI Lab research tab for planning context.",
  },
];

export function AiFeatureShowcase() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <article
            key={feature.title}
            className="glass-card relative overflow-hidden p-5 transition hover:-translate-y-0.5"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--brand-soft)] blur-2xl" />
            <div className="relative">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {feature.body}
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)]">
                <Sparkles className="h-3.5 w-3.5" />
                {feature.usage}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
