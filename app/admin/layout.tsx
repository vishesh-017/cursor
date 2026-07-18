import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StorageModeBanner } from "@/components/shared/storage-mode-banner";
import { adminShellTitle } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { adminNav } from "@/lib/nav";

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
    <AppShell title={adminShellTitle(session)} nav={adminNav} user={session}>
      <StorageModeBanner />
      {children}
    </AppShell>
  );
}
