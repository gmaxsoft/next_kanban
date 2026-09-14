import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireAuth } from "@/lib/auth-utils";
import {
  listChatMembers,
  listRecentChatMessages,
  listTeamsForChat,
} from "@/lib/chat-data";
import { DEFAULT_TEAM_ID } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Czat",
};

type ChatPageProps = {
  searchParams: Promise<{ team?: string | string[] }>;
};

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

  const rawTeam = (await searchParams).team;
  const requested = (Array.isArray(rawTeam) ? rawTeam[0] : rawTeam) ?? "";
  const preferred =
    teams.find((team) => team.id === requested)?.id ??
    teams.find((team) => team.id === session.user.teamId)?.id ??
    teams.find((team) => team.id === DEFAULT_TEAM_ID)?.id ??
    teams[0].id;

  if (requested !== preferred) {
    redirect(`/chat?team=${preferred}`);
  }

  const [messages, members] = await Promise.all([
    listRecentChatMessages(preferred),
    listChatMembers(preferred),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Czat</h2>
        <p className="text-sm text-muted-foreground">
          Rozmowa w obrębie zespołu — zmień zespół, aby dołączyć do innego kanału.
        </p>
      </div>

      <ChatRoom
        key={preferred}
        currentUserId={session.user.id}
        teamId={preferred}
        teams={teams}
        members={members}
        initialMessages={messages}
      />
    </div>
  );
}
