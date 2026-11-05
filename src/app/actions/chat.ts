"use server";

import { revalidatePath } from "next/cache";

import { denyIfRestricted } from "@/lib/auth-utils";
import { getOrCreateGroupConversation } from "@/lib/chat-data";
import {
  countUnreadChatMessages,
  markChatTeamRead,
  markDirectConversationRead,
  markGroupConversationRead,
} from "@/lib/chat-unread";
import { prisma } from "@/lib/prisma";
import { createGroupConversationSchema } from "@/lib/validations/chat";

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

export async function markGroupConversationAsRead(conversationId: string) {
  const access = await denyIfRestricted();
  if (access.error) {
    return { error: access.error };
  }
  const session = access.session;

  if (!conversationId) {
    return { error: "Brak grupy." as const };
  }

  const membership = await prisma.groupConversationMember.findFirst({
    where: {
      conversationId,
      userId: session.user.id,
    },
    select: { conversationId: true },
  });

  if (!membership) {
    return { error: "Nie znaleziono grupy." as const };
  }

  await markGroupConversationRead(session.user.id, membership.conversationId);
  const unreadCount = await countUnreadChatMessages(session.user.id);

  revalidatePath("/", "layout");
  revalidatePath("/chat");

  return { success: true as const, unreadCount };
}

export async function createGroupConversationAction(memberIds: string[]) {
  const access = await denyIfRestricted();
  if (access.error) {
    return { error: access.error };
  }
  const session = access.session;

  const parsed = createGroupConversationSchema.safeParse({ memberIds });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        ("Zaznacz co najmniej 2 osoby." as const),
    };
  }

  const group = await getOrCreateGroupConversation(
    session.user.id,
    parsed.data.memberIds,
  );

  if (!group) {
    return { error: "Nie udało się utworzyć grupy." as const };
  }

  revalidatePath("/chat");

  return {
    success: true as const,
    conversationId: group.conversationId,
    name: group.name,
  };
}

export async function deleteGroupConversationAction(conversationId: string) {
  const access = await denyIfRestricted();
  if (access.error) {
    return { error: access.error };
  }
  const session = access.session;

  if (!conversationId) {
    return { error: "Brak grupy." as const };
  }

  const membership = await prisma.groupConversationMember.findFirst({
    where: {
      conversationId,
      userId: session.user.id,
    },
    select: { conversationId: true },
  });

  if (!membership) {
    return { error: "Nie znaleziono grupy." as const };
  }

  await prisma.groupConversation.delete({
    where: { id: membership.conversationId },
  });

  revalidatePath("/", "layout");
  revalidatePath("/chat");

  return { success: true as const };
}
