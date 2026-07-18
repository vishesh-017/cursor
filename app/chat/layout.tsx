import { AppShell } from "@/components/layout/app-shell";
import { adminShellTitle } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { adminNav, citizenNav } from "@/lib/nav";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session?.role === "citizen") {
    return (
      <AppShell title="Citizen Portal" nav={citizenNav} user={session}>
        {children}
      </AppShell>
    );
  }

  if (session?.role === "admin" || session?.role === "officer") {
    return (
      <AppShell title={adminShellTitle(session)} nav={adminNav} user={session}>
        {children}
      </AppShell>
    );
  }

  return children;
}
