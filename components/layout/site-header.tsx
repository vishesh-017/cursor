"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "GIS Map" },
  { href: "/intel", label: "Exa Intel" },
  { href: "/login", label: "Sign in" },
  { href: "/citizen/dashboard", label: "Citizen" },
  { href: "/admin/dashboard", label: "Admin" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const hideOnAuthShell =
    pathname.startsWith("/citizen") || pathname.startsWith("/admin");

  if (hideOnAuthShell) {
    return (
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold text-white">
            {siteConfig.name}
          </Link>
          <div className="flex gap-3 text-sm text-slate-300">
            <Link href="/map" className="hover:text-white">
              GIS Map
            </Link>
            <Link href="/intel" className="hover:text-white">
              Exa Intel
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-semibold tracking-tight text-white"
          >
            {siteConfig.name}
          </motion.span>
          <span className="hidden rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal-200 sm:inline">
            AMC
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
