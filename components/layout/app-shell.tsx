"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import type { SessionUser } from "@/types";

type NavItem = { href: string; label: string };

export function AppShell({
  title,
  nav,
  user,
  children,
}: {
  title: string;
  nav: NavItem[];
  user?: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-200/80 bg-white/70 backdrop-blur lg:border-b-0 lg:border-r">
        <div className="sticky top-16 p-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            {title}
          </p>
          <nav className="mt-3 space-y-1">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {user ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 text-xs font-medium text-teal-700 hover:underline"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-4 py-6 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </div>
  );
}
