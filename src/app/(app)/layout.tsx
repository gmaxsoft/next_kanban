import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import {
  countUnreadNotifications,
  ensureDemoNotifications,
  listNotifications,
} from "@/lib/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await ensureDemoNotifications(
    session.user.id,
    session.user.name ?? "Użytkowniku",
  );

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(session.user.id),
    countUnreadNotifications(session.user.id),
  ]);

  return (
    <AppShell
      user={session.user}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
