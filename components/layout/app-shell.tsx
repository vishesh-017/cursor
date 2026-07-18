"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileText,
  HeartPulse,
  Home,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Map,
  MapPinned,
  Menu,
  Moon,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { UrbanexusLogo } from "@/components/brand/urbanexus-logo";
import { cn } from "@/utils/cn";
import type { SessionUser } from "@/types";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const iconMap: Record<string, LucideIcon> = {
  Home,
  LayoutDashboard,
  PlusCircle,
  FileText,
  Award,
  Trophy,
  Bell,
  UserRound,
  Settings,
  Map,
  BarChart3,
  ListOrdered,
  HeartPulse,
  Activity,
  MapPinned,
  Building2,
  Users,
  Sparkles,
};

export function resolveNavIcon(name: string): LucideIcon {
  return iconMap[name] ?? CircleDot;
}

export function AppShell({
  title,
  nav,
  user,
  children,
}: {
  title: string;
  nav: Array<{ href: string; label: string; icon?: string }>;
  user?: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const items = useMemo(
    () =>
      nav.map((item) => ({
        ...item,
        Icon: item.icon ? resolveNavIcon(item.icon) : CircleDot,
      })),
    [nav]
  );

  useEffect(() => {
    const stored = localStorage.getItem("urbanexus-theme");
    const preferDark = stored === "dark";
    setDark(preferDark);
    document.documentElement.classList.toggle("dark", preferDark);
  }, []);

  useEffect(() => {
    void fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { success?: boolean; data?: { notifications: Array<{ read: boolean }> } }) => {
        if (json.success && json.data) {
          setUnread(json.data.notifications.filter((n) => !n.read).length);
        }
      })
      .catch(() => undefined);
  }, [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("urbanexus-theme", next ? "dark" : "light");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out of Urbanexus");
    router.push("/login");
    router.refresh();
  }

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    if (title.toLowerCase().includes("admin")) {
      router.push(`/admin/reports?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(`/citizen/reports?q=${encodeURIComponent(query.trim())}`);
    }
    setQuery("");
  }

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-text)] transition-all duration-300",
        collapsed ? "w-[84px]" : "w-[272px]"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {collapsed ? (
            <UrbanexusLogo wordmark={false} inverted size="sm" />
          ) : (
            <span className="min-w-0">
              <UrbanexusLogo inverted size="sm" />
              <p className="mt-1 truncate pl-[2.85rem] text-[11px] uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
                {title}
              </p>
            </span>
          )}
        </Link>
        <button
          type="button"
          className="hidden rounded-xl border border-white/10 p-2 text-[var(--sidebar-muted)] hover:bg-white/5 lg:inline-flex"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3">
        <Link
          href={title.toLowerCase().includes("admin") ? "/admin/priority" : "/citizen/reports/new"}
          className={cn(
            "flex items-center gap-3 rounded-2xl bg-[var(--brand)] px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/30 transition hover:bg-[var(--brand-strong)]",
            collapsed && "justify-center px-0"
          )}
        >
          <PlusCircle className="h-4 w-4 shrink-0" />
          {!collapsed ? <span>Quick action</span> : null}
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/citizen/dashboard" &&
              item.href !== "/admin/dashboard" &&
              item.href !== "/map" &&
              pathname.startsWith(`${item.href}/`));
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white",
                collapsed && "justify-center px-0"
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--brand)]" />
              ) : null}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href={user?.role === "citizen" ? "/citizen/profile" : "/admin/dashboard"}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10",
            collapsed && "justify-center"
          )}
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-white/10">
            <Image
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          {!collapsed && user ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{user.ward} ward</p>
            </div>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        ) : null}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-transparent">
      <div className="hidden lg:block">{sidebar}</div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="absolute inset-y-0 left-0"
            >
              {sidebar}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--topbar)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] bg-white/70 p-2 lg:hidden dark:bg-white/5"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <form onSubmit={onSearch} className="relative min-w-0 flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reports, wards, SG Highway, Maninagar…"
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-white/80 pl-10 pr-3 text-sm outline-none ring-[var(--ring)] placeholder:text-[var(--muted)] focus:ring-2 dark:bg-white/5"
                aria-label="Global search"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2 text-xs font-medium md:flex dark:bg-white/5">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Exa AI online
              </div>
              <div className="hidden items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2 text-xs font-medium sm:flex dark:bg-white/5">
                <MapPinned className="h-3.5 w-3.5 text-[var(--brand)]" />
                {user?.ward ?? "Ahmedabad"}
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-2xl border border-[var(--border)] bg-white/70 p-2.5 dark:bg-white/5"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setUserOpen(false);
                  }}
                  className="relative rounded-2xl border border-[var(--border)] bg-white/70 p-2.5 dark:bg-white/5"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-3 shadow-xl">
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {unread} unread civic updates
                    </p>
                    <Link
                      href={
                        user?.role === "citizen"
                          ? "/citizen/notifications"
                          : "/admin/priority"
                      }
                      className="mt-3 inline-flex text-xs font-semibold text-[var(--brand)]"
                      onClick={() => setNotifOpen(false)}
                    >
                      Open notification center →
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 py-1.5 pl-1.5 pr-3 dark:bg-white/5"
                >
                  <div className="relative h-8 w-8 overflow-hidden rounded-xl">
                    <Image
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"
                      alt=""
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user?.name.split(" ")[0] ?? "User"}
                  </span>
                </button>
                {userOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-2 shadow-xl">
                    <Link
                      href={user?.role === "citizen" ? "/citizen/profile" : "/admin/dashboard"}
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={() => setUserOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href={user?.role === "citizen" ? "/citizen/settings" : "/admin/analytics"}
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={() => setUserOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <X className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="amc-grid flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}
