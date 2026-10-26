import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireAuth } from "@/lib/auth-utils";
import {
  getOrCreateDirectConversation,
  listChatMembers,
  listRecentChatMessages,
  listRecentDirectMessages,
  listRecentDirectPeers,
  listTeamsForChat,
} from "@/lib/chat-data";
import {
  markChatTeamRead,
  markDirectConversationRead,
} from "@/lib/chat-unread";
import { DEFAULT_TEAM_ID } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Czat",
};

type ChatPageProps = {
  searchParams: Promise<{
    team?: string | string[];
    dm?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const session = await requireAuth();
  const teams = await listTeamsForChat();

  if (teams.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <h2 className="text-2xl font-semibold">Czat</h2>
        <p className="text-sm text-muted-foreground">
          Brak zespołów — utwórz zespół w Ustawieniach.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const requestedTeam = firstParam(params.team).trim();
  const requestedDm = firstParam(params.dm).trim();

  const preferredTeam =
    teams.find((team) => team.id === requestedTeam)?.id ??
    teams.find((team) => team.id === session.user.teamId)?.id ??
    teams.find((team) => team.id === DEFAULT_TEAM_ID)?.id ??
    teams[0].id;

  if (requestedDm) {
    if (requestedDm === session.user.id) {
      redirect(`/chat?team=${preferredTeam}`);
    }

    const dm = await getOrCreateDirectConversation(
      session.user.id,
      requestedDm,
    );

    if (!dm) {
      notFound();
    }

    if (requestedTeam !== preferredTeam) {
      redirect(`/chat?team=${preferredTeam}&dm=${requestedDm}`);
    }

    const [messages, members, recentPeers] = await Promise.all([
      listRecentDirectMessages(dm.conversationId),
      listChatMembers(preferredTeam),
      listRecentDirectPeers(session.user.id),
      markDirectConversationRead(session.user.id, dm.conversationId),
    ]);

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Czat</h2>
          <p className="text-sm text-muted-foreground">
            Rozmowa prywatna z {dm.peer.name}. Wiadomości widzicie tylko wy
            dwoje.
          </p>
        </div>

        <ChatRoom
          key={`dm-${dm.conversationId}`}
          mode="dm"
          currentUserId={session.user.id}
          teamId={preferredTeam}
          teams={teams}
          members={members}
          initialMessages={messages}
          peer={dm.peer}
          conversationId={dm.conversationId}
          recentPeers={recentPeers}
        />
      </div>
    );
  }

  if (requestedTeam !== preferredTeam) {
    redirect(`/chat?team=${preferredTeam}`);
  }

  const [messages, members, recentPeers] = await Promise.all([
    listRecentChatMessages(preferredTeam),
    listChatMembers(preferredTeam),
    listRecentDirectPeers(session.user.id),
    markChatTeamRead(session.user.id, preferredTeam),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Czat</h2>
        <p className="text-sm text-muted-foreground">
          Kanał zespołu albo rozmowa 1:1 — kliknij osobę na liście po prawej.
        </p>
      </div>

      <ChatRoom
        key={preferredTeam}
        mode="team"
        currentUserId={session.user.id}
        teamId={preferredTeam}
        teams={teams}
        members={members}
        initialMessages={messages}
        recentPeers={recentPeers}
      />
    </div>
  );
}
