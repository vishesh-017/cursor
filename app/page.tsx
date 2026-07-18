import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=2000&q=80"
          alt="Ahmedabad city skyline and urban infrastructure"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-teal-950/40" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">
          {siteConfig.organization}
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
          {siteConfig.name}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
          AI-powered urban infrastructure intelligence for Ahmedabad — map issues,
          triage reports, and brief AMC officers with Exa research.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white hover:bg-teal-400"
          >
            Open ops dashboard
          </Link>
          <Link
            href="/report"
            className="inline-flex h-11 items-center rounded-md border border-white/30 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
          >
            Report an issue
          </Link>
          <Link
            href="/intel"
            className="inline-flex h-11 items-center rounded-md px-5 text-sm font-medium text-teal-100 hover:text-white"
          >
            Run Exa intel →
          </Link>
        </div>
      </div>
    </section>
  );
}
