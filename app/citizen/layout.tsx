import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

const nav = [
  { href: "/citizen/dashboard", label: "Command Center", icon: "LayoutDashboard" },
  { href: "/citizen/reports/new", label: "Report Issue", icon: "PlusCircle" },
  { href: "/citizen/reports", label: "My Reports", icon: "FileText" },
  { href: "/citizen/rewards", label: "Rewards", icon: "Award" },
  { href: "/citizen/leaderboard", label: "Leaderboard", icon: "Trophy" },
  { href: "/citizen/notifications", label: "Notifications", icon: "Bell" },
  { href: "/citizen/profile", label: "Profile", icon: "UserRound" },
  { href: "/citizen/settings", label: "Settings", icon: "Settings" },
  { href: "/map", label: "City Map", icon: "Map" },
];

export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "citizen") {
    redirect("/login");
  }

  return (
    <AppShell title="Citizen Portal" nav={nav} user={session}>
      {children}
    </AppShell>
  );
}
