import { prisma } from "@/lib/prisma";
import {
  CHAT_HISTORY_LIMIT,
  pairDirectUserIds,
  toChatMessageDto,
  toDirectMessageDto,
  type ChatMember,
  type ChatMessageDto,
  type ChatTeamOption,
  type DirectMessageDto,
  type DirectPeer,
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

export async function getActiveChatUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { id: true, name: true, avatarUrl: true, teamId: true },
  });
}

export async function getOrCreateDirectConversation(
  userId: string,
  peerUserId: string,
) {
  if (userId === peerUserId) {
    return null;
  }

  const peer = await getActiveChatUser(peerUserId);
  if (!peer) {
    return null;
  }

  const pair = pairDirectUserIds(userId, peerUserId);

  const conversation = await prisma.directConversation.upsert({
    where: {
      userLowId_userHighId: pair,
    },
    create: pair,
    update: {},
    select: { id: true },
  });

  return {
    conversationId: conversation.id,
    peer,
  };
}

export async function listRecentDirectMessages(
  conversationId: string,
  limit = CHAT_HISTORY_LIMIT,
): Promise<DirectMessageDto[]> {
  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  return messages.reverse().map(toDirectMessageDto);
}

export async function listRecentDirectPeers(
  userId: string,
  unreadByPeer: Record<string, number> = {},
): Promise<DirectPeer[]> {
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [{ userLowId: userId }, { userHighId: userId }],
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      userLow: { select: { id: true, name: true, avatarUrl: true, isActive: true } },
      userHigh: { select: { id: true, name: true, avatarUrl: true, isActive: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const peers: DirectPeer[] = [];

  for (const conversation of conversations) {
    if (conversation.messages.length === 0) {
      continue;
    }

    const peer =
      conversation.userLowId === userId
        ? conversation.userHigh
        : conversation.userLow;

    if (!peer.isActive) {
      continue;
    }

    peers.push({
      id: peer.id,
      name: peer.name,
      avatarUrl: peer.avatarUrl,
      conversationId: conversation.id,
      unreadCount: unreadByPeer[peer.id] ?? 0,
    });
  }

  return peers;
}

export async function userIsConversationParticipant(
  conversationId: string,
  userId: string,
) {
  const conversation = await prisma.directConversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userLowId: userId }, { userHighId: userId }],
    },
    select: { id: true },
  });

  return Boolean(conversation);
}
