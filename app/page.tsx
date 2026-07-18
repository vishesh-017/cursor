import Image from "next/image";
import Link from "next/link";
import { UrbanexusLogo } from "@/components/brand/urbanexus-logo";
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
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/72 to-teal-950/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(43,181,174,0.22),transparent_40%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
        <div className="mb-6">
          <UrbanexusLogo inverted size="lg" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
          {siteConfig.organization}
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
          Urbanexus
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
          AI-powered urban infrastructure intelligence for Ahmedabad — Exa AI
          triage, enterprise GIS, and AMC operations in one premium civic platform.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-2xl bg-teal-400 px-6 text-sm font-semibold text-slate-950 hover:bg-teal-300"
          >
            Sign in to portal
          </Link>
          <Link
            href="/map"
            className="inline-flex h-12 items-center rounded-2xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            Open GIS map
          </Link>
          <Link
            href="/admin/dashboard"
            className="inline-flex h-12 items-center rounded-2xl px-5 text-sm font-medium text-teal-100 hover:text-white"
          >
            AMC command center →
          </Link>
        </div>
      </div>
    </section>
  );
}
