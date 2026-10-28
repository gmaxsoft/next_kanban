"use server";

import { revalidatePath } from "next/cache";

import { denyIfRestricted } from "@/lib/auth-utils";
import {
  countUnreadChatMessages,
  markChatTeamRead,
  markDirectConversationRead,
} from "@/lib/chat-unread";
import { prisma } from "@/lib/prisma";

export async function markChatTeamAsRead(teamId: string) {
  const access = await denyIfRestricted();
  if (access.error) {
    return { error: access.error };
  }
  const session = access.session;

  if (!teamId) {
    return { error: "Brak zespołu." as const };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    return { error: "Nie znaleziono zespołu." as const };
  }

  await markChatTeamRead(session.user.id, team.id);
  const unreadCount = await countUnreadChatMessages(session.user.id);

  revalidatePath("/", "layout");
  revalidatePath("/chat");

  return { success: true as const, unreadCount };
}

export async function markDirectConversationAsRead(conversationId: string) {
  const access = await denyIfRestricted();
  if (access.error) {
    return { error: access.error };
  }
  const session = access.session;

  if (!conversationId) {
    return { error: "Brak rozmowy." as const };
  }

  const conversation = await prisma.directConversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userLowId: session.user.id },
        { userHighId: session.user.id },
      ],
    },
    select: { id: true },
  });

  if (!conversation) {
    return { error: "Nie znaleziono rozmowy." as const };
  }

  await markDirectConversationRead(session.user.id, conversation.id);
  const unreadCount = await countUnreadChatMessages(session.user.id);

  revalidatePath("/", "layout");
  revalidatePath("/chat");

  return { success: true as const, unreadCount };
}
