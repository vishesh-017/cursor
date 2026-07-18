import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/priority", label: "Priority Queue" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/urban-pulse", label: "Urban Pulse" },
  { href: "/admin/infrastructure-health", label: "Infrastructure Health" },
  { href: "/admin/wards", label: "Ward Performance" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/citizens", label: "Citizens" },
  { href: "/map", label: "Map" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "officer")) {
    redirect("/login");
  }

  return (
    <AppShell title="AMC Operations" nav={nav} user={session}>
      {children}
    </AppShell>
  );
}
