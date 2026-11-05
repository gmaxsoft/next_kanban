import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  CHAT_HISTORY_LIMIT,
  GROUP_CHAT_MAX_OTHERS,
  GROUP_CHAT_MIN_OTHERS,
  defaultGroupName,
  pairDirectUserIds,
  toChatMessageDto,
  toDirectMessageDto,
  toGroupMessageDto,
  type ChatMember,
  type ChatMessageDto,
  type ChatTeamOption,
  type DirectMessageDto,
  type DirectPeer,
  type GroupConversationSummary,
  type GroupMessageDto,
} from "@/lib/chat";

/** Stable SHA-256 key for a unique set of participants (sorted UUIDs). */
function groupMemberKey(memberIds: string[]) {
  const raw = [...new Set(memberIds)].sort().join(",");
  return createHash("sha256").update(raw).digest("hex");
}

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

export async function getOrCreateGroupConversation(
  creatorId: string,
  otherMemberIds: string[],
) {
  const uniqueOthers = [...new Set(otherMemberIds)].filter(
    (id) => id !== creatorId,
  );

  if (
    uniqueOthers.length < GROUP_CHAT_MIN_OTHERS ||
    uniqueOthers.length > GROUP_CHAT_MAX_OTHERS
  ) {
    return null;
  }

  const members = await prisma.user.findMany({
    where: { id: { in: uniqueOthers }, isActive: true },
    select: { id: true, name: true, avatarUrl: true },
  });

  if (members.length !== uniqueOthers.length) {
    return null;
  }

  const creator = await getActiveChatUser(creatorId);
  if (!creator) {
    return null;
  }

  const allIds = [creatorId, ...uniqueOthers];
  const memberKey = groupMemberKey(allIds);
  const allMembers: ChatMember[] = [
    { id: creator.id, name: creator.name, avatarUrl: creator.avatarUrl },
    ...members,
  ];
  const name = defaultGroupName(allMembers.map((m) => m.name));

  const existing = await prisma.groupConversation.findUnique({
    where: { memberKey },
    select: {
      id: true,
      name: true,
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (existing) {
    return {
      conversationId: existing.id,
      name: existing.name ?? name,
      members: existing.members.map((row) => row.user),
    };
  }

  const conversation = await prisma.groupConversation.create({
    data: {
      memberKey,
      name,
      createdById: creatorId,
      members: {
        create: allIds.map((userId) => ({ userId })),
      },
    },
    select: {
      id: true,
      name: true,
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  return {
    conversationId: conversation.id,
    name: conversation.name ?? name,
    members: conversation.members.map((row) => row.user),
  };
}

export async function getGroupConversationForUser(
  conversationId: string,
  userId: string,
) {
  const conversation = await prisma.groupConversation.findFirst({
    where: {
      id: conversationId,
      members: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  const members = conversation.members.map((row) => row.user);
  return {
    conversationId: conversation.id,
    name:
      conversation.name ??
      defaultGroupName(members.map((member) => member.name)),
    members,
  };
}

export async function listRecentGroupMessages(
  conversationId: string,
  limit = CHAT_HISTORY_LIMIT,
): Promise<GroupMessageDto[]> {
  const messages = await prisma.groupMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  return messages.reverse().map(toGroupMessageDto);
}

export async function listRecentGroupConversations(
  userId: string,
  unreadByGroup: Record<string, number> = {},
): Promise<GroupConversationSummary[]> {
  const memberships = await prisma.groupConversationMember.findMany({
    where: { userId },
    select: {
      conversation: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true, isActive: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
    take: 20,
  });

  const groups: GroupConversationSummary[] = [];

  for (const { conversation } of memberships) {
    const members = conversation.members
      .filter((row) => row.user.isActive)
      .map((row) => ({
        id: row.user.id,
        name: row.user.name,
        avatarUrl: row.user.avatarUrl,
      }));

    groups.push({
      id: conversation.id,
      name:
        conversation.name ??
        defaultGroupName(members.map((member) => member.name)),
      members,
      unreadCount: unreadByGroup[conversation.id] ?? 0,
    });
  }

  return groups;
}

export async function userIsGroupParticipant(
  conversationId: string,
  userId: string,
) {
  const member = await prisma.groupConversationMember.findFirst({
    where: { conversationId, userId },
    select: { id: true },
  });

  return Boolean(member);
}

export async function listGroupMemberIds(conversationId: string) {
  const members = await prisma.groupConversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  return members.map((row) => row.userId);
}
