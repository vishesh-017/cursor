import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

const nav = [
  { href: "/citizen/dashboard", label: "Dashboard" },
  { href: "/citizen/reports/new", label: "Report Issue" },
  { href: "/citizen/reports", label: "My Reports" },
  { href: "/citizen/rewards", label: "Rewards" },
  { href: "/citizen/leaderboard", label: "Leaderboard" },
  { href: "/citizen/notifications", label: "Notifications" },
  { href: "/citizen/profile", label: "Profile" },
  { href: "/citizen/settings", label: "Settings" },
  { href: "/map", label: "Map" },
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
