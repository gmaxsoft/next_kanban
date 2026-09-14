import { prisma } from "@/lib/prisma";
import {
  CHAT_HISTORY_LIMIT,
  toChatMessageDto,
  type ChatMember,
  type ChatMessageDto,
  type ChatTeamOption,
} from "@/lib/chat";

export async function listTeamsForChat(): Promise<ChatTeamOption[]> {
  return prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listRecentChatMessages(
  teamId: string,
  limit = CHAT_HISTORY_LIMIT,
): Promise<ChatMessageDto[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  return messages.reverse().map(toChatMessageDto);
}

export async function listChatMembers(teamId: string): Promise<ChatMember[]> {
  return prisma.user.findMany({
    where: { isActive: true, teamId },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}
