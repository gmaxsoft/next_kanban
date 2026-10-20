import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { listTeamsForChat } from "@/lib/chat-data";
import { countUnreadChatMessages } from "@/lib/chat-unread";
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

  const [notifications, unreadCount, chatTeams, chatUnreadCount] =
    await Promise.all([
      listNotifications(session.user.id),
      countUnreadNotifications(session.user.id),
      listTeamsForChat(),
      countUnreadChatMessages(session.user.id),
    ]);

  return (
    <AppShell
      user={session.user}
      notifications={notifications}
      unreadCount={unreadCount}
      chatUnreadCount={chatUnreadCount}
      chatTeamIds={chatTeams.map((team) => team.id)}
    >
      {children}
    </AppShell>
  );
}
