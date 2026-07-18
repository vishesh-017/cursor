import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";
import { citizenNav } from "@/lib/nav";

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
    <AppShell title="Citizen Portal" nav={citizenNav} user={session}>
      {children}
    </AppShell>
  );
}
