"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/cn";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "GIS Map" },
  { href: "/intel", label: "Exa Intel" },
  { href: "/login", label: "Sign in" },
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/citizen") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-500/20 text-teal-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-lg font-semibold tracking-tight text-white"
          >
            {siteConfig.name}
          </motion.span>
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
