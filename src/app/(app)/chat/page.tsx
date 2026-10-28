import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireUnrestrictedAuth } from "@/lib/auth-utils";
import {
  getOrCreateDirectConversation,
  listChatMembers,
  listRecentChatMessages,
  listRecentDirectMessages,
  listRecentDirectPeers,
  listTeamsForChat,
} from "@/lib/chat-data";
import {
  countUnreadDirectByPeer,
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
  const session = await requireUnrestrictedAuth();
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

    // Mark read before counting so this peer shows 0 unread.
    await markDirectConversationRead(session.user.id, dm.conversationId);

    const [messages, members, unreadByPeer] = await Promise.all([
      listRecentDirectMessages(dm.conversationId),
      listChatMembers(preferredTeam),
      countUnreadDirectByPeer(session.user.id),
    ]);
    const recentPeers = await listRecentDirectPeers(
      session.user.id,
      unreadByPeer,
    );

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
          initialDmUnreadByPeer={unreadByPeer}
        />
      </div>
    );
  }

  if (requestedTeam !== preferredTeam) {
    redirect(`/chat?team=${preferredTeam}`);
  }

  const [messages, members, unreadByPeer] = await Promise.all([
    listRecentChatMessages(preferredTeam),
    listChatMembers(preferredTeam),
    countUnreadDirectByPeer(session.user.id),
    markChatTeamRead(session.user.id, preferredTeam),
  ]);
  const recentPeers = await listRecentDirectPeers(
    session.user.id,
    unreadByPeer,
  );

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
        initialDmUnreadByPeer={unreadByPeer}
      />
    </div>
  );
}
