import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireUnrestrictedAuth } from "@/lib/auth-utils";
import {
  getGroupConversationForUser,
  getOrCreateDirectConversation,
  listChatMembers,
  listRecentChatMessages,
  listRecentDirectMessages,
  listRecentDirectPeers,
  listRecentGroupConversations,
  listRecentGroupMessages,
  listTeamsForChat,
} from "@/lib/chat-data";
import {
  countUnreadDirectByPeer,
  countUnreadGroupById,
  markChatTeamRead,
  markDirectConversationRead,
  markGroupConversationRead,
} from "@/lib/chat-unread";
import { DEFAULT_TEAM_ID } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Czat",
};

type ChatPageProps = {
  searchParams: Promise<{
    team?: string | string[];
    dm?: string | string[];
    group?: string | string[];
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
  const requestedGroup = firstParam(params.group).trim();

  const preferredTeam =
    teams.find((team) => team.id === requestedTeam)?.id ??
    teams.find((team) => team.id === session.user.teamId)?.id ??
    teams.find((team) => team.id === DEFAULT_TEAM_ID)?.id ??
    teams[0].id;

  if (requestedGroup) {
    const group = await getGroupConversationForUser(
      requestedGroup,
      session.user.id,
    );

    if (!group) {
      notFound();
    }

    if (requestedTeam !== preferredTeam) {
      redirect(`/chat?team=${preferredTeam}&group=${requestedGroup}`);
    }

    await markGroupConversationRead(session.user.id, group.conversationId);

    const [messages, members, unreadByPeer, unreadByGroup] = await Promise.all([
      listRecentGroupMessages(group.conversationId),
      listChatMembers(preferredTeam),
      countUnreadDirectByPeer(session.user.id),
      countUnreadGroupById(session.user.id),
    ]);
    const [recentPeers, recentGroups] = await Promise.all([
      listRecentDirectPeers(session.user.id, unreadByPeer),
      listRecentGroupConversations(session.user.id, unreadByGroup),
    ]);

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Czat</h2>
          <p className="text-sm text-muted-foreground">
            Rozmowa grupowa · {group.name}
          </p>
        </div>

        <ChatRoom
          key={`group-${group.conversationId}`}
          mode="group"
          currentUserId={session.user.id}
          teamId={preferredTeam}
          teams={teams}
          members={members}
          initialMessages={messages}
          conversationId={group.conversationId}
          groupName={group.name}
          groupMembers={group.members}
          recentPeers={recentPeers}
          recentGroups={recentGroups}
          initialDmUnreadByPeer={unreadByPeer}
          initialGroupUnreadById={unreadByGroup}
        />
      </div>
    );
  }

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

    await markDirectConversationRead(session.user.id, dm.conversationId);

    const [messages, members, unreadByPeer, unreadByGroup] = await Promise.all([
      listRecentDirectMessages(dm.conversationId),
      listChatMembers(preferredTeam),
      countUnreadDirectByPeer(session.user.id),
      countUnreadGroupById(session.user.id),
    ]);
    const [recentPeers, recentGroups] = await Promise.all([
      listRecentDirectPeers(session.user.id, unreadByPeer),
      listRecentGroupConversations(session.user.id, unreadByGroup),
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
          recentGroups={recentGroups}
          initialDmUnreadByPeer={unreadByPeer}
          initialGroupUnreadById={unreadByGroup}
        />
      </div>
    );
  }

  if (requestedTeam !== preferredTeam) {
    redirect(`/chat?team=${preferredTeam}`);
  }

  const [messages, members, unreadByPeer, unreadByGroup] = await Promise.all([
    listRecentChatMessages(preferredTeam),
    listChatMembers(preferredTeam),
    countUnreadDirectByPeer(session.user.id),
    countUnreadGroupById(session.user.id),
    markChatTeamRead(session.user.id, preferredTeam),
  ]);
  const [recentPeers, recentGroups] = await Promise.all([
    listRecentDirectPeers(session.user.id, unreadByPeer),
    listRecentGroupConversations(session.user.id, unreadByGroup),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Czat</h2>
        <p className="text-sm text-muted-foreground">
          Kanał zespołu, DM albo grupa (Ctrl+klik lub Ctrl+A).
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
        recentGroups={recentGroups}
        initialDmUnreadByPeer={unreadByPeer}
        initialGroupUnreadById={unreadByGroup}
      />
    </div>
  );
}
