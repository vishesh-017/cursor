"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UrbanexusLogo } from "@/components/brand/urbanexus-logo";
import { cn } from "@/utils/cn";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "GIS Map" },
  { href: "/intel", label: "Exa Intel" },
  { href: "/login", label: "Sign in" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [shellActive, setShellActive] = useState(
    pathname.startsWith("/citizen") || pathname.startsWith("/admin")
  );

  useEffect(() => {
    if (pathname.startsWith("/citizen") || pathname.startsWith("/admin")) {
      setShellActive(true);
      return;
    }
    if (pathname.startsWith("/map")) {
      let active = true;
      void fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((json: { success?: boolean; data?: { user?: unknown } }) => {
          if (active) setShellActive(Boolean(json.success && json.data?.user));
        })
        .catch(() => {
          if (active) setShellActive(false);
        });
      return () => {
        active = false;
      };
    }
    setShellActive(false);
  }, [pathname]);

  if (shellActive) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <UrbanexusLogo inverted size="sm" />
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm transition",
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
