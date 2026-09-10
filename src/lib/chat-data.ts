import { prisma } from "@/lib/prisma";
import {
  CHAT_HISTORY_LIMIT,
  toChatMessageDto,
  type ChatMember,
  type ChatMessageDto,
} from "@/lib/chat";

export async function listRecentChatMessages(
  limit = CHAT_HISTORY_LIMIT,
): Promise<ChatMessageDto[]> {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return messages.reverse().map(toChatMessageDto);
}

export async function listChatMembers(): Promise<ChatMember[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}
