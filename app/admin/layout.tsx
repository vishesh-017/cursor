import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

const nav = [
  { href: "/admin/dashboard", label: "Command Center", icon: "LayoutDashboard" },
  { href: "/admin/reports", label: "Reports", icon: "FileText" },
  { href: "/admin/priority", label: "Priority Queue", icon: "ListOrdered" },
  { href: "/admin/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/admin/urban-pulse", label: "Urban Pulse", icon: "Activity" },
  { href: "/admin/infrastructure-health", label: "Infra Health", icon: "HeartPulse" },
  { href: "/admin/wards", label: "Ward Performance", icon: "MapPinned" },
  { href: "/admin/departments", label: "Departments", icon: "Building2" },
  { href: "/admin/citizens", label: "Citizens", icon: "Users" },
  { href: "/map", label: "City Map", icon: "Map" },
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
    <AppShell title="AMC Ops" nav={nav} user={session}>
      {children}
    </AppShell>
  );
}
