import { prisma } from "@/lib/prisma";

/** First login / new teams: baseline so only future messages count as unread. */
export async function ensureChatTeamReads(userId: string) {
  const teams = await prisma.team.findMany({ select: { id: true } });

  if (teams.length === 0) {
    return;
  }

  const existing = await prisma.chatTeamRead.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const known = new Set(existing.map((row) => row.teamId));
  const missing = teams.filter((team) => !known.has(team.id));

  if (missing.length === 0) {
    return;
  }

  const now = new Date();
  await prisma.chatTeamRead.createMany({
    data: missing.map((team) => ({
      userId,
      teamId: team.id,
      lastReadAt: now,
    })),
  });
}

export async function ensureDirectConversationReads(userId: string) {
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [{ userLowId: userId }, { userHighId: userId }],
    },
    select: { id: true },
  });

  if (conversations.length === 0) {
    return;
  }

  const existing = await prisma.directConversationRead.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const known = new Set(existing.map((row) => row.conversationId));
  const missing = conversations.filter((row) => !known.has(row.id));

  if (missing.length === 0) {
    return;
  }

  const now = new Date();
  await prisma.directConversationRead.createMany({
    data: missing.map((row) => ({
      userId,
      conversationId: row.id,
      lastReadAt: now,
    })),
  });
}

async function countUnreadTeamMessages(userId: string) {
  await ensureChatTeamReads(userId);

  const reads = await prisma.chatTeamRead.findMany({
    where: { userId },
    select: { teamId: true, lastReadAt: true },
  });

  if (reads.length === 0) {
    return 0;
  }

  const counts = await Promise.all(
    reads.map((row) =>
      prisma.chatMessage.count({
        where: {
          teamId: row.teamId,
          authorId: { not: userId },
          createdAt: { gt: row.lastReadAt },
        },
      }),
    ),
  );

  return counts.reduce((sum, value) => sum + value, 0);
}

async function countUnreadDirectMessages(userId: string) {
  const byPeer = await countUnreadDirectByPeer(userId);
  return Object.values(byPeer).reduce((sum, value) => sum + value, 0);
}

/** Unread DM counts keyed by the peer who sent them. */
export async function countUnreadDirectByPeer(
  userId: string,
): Promise<Record<string, number>> {
  await ensureDirectConversationReads(userId);

  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [{ userLowId: userId }, { userHighId: userId }],
    },
    select: {
      id: true,
      userLowId: true,
      userHighId: true,
      reads: {
        where: { userId },
        select: { lastReadAt: true },
        take: 1,
      },
    },
  });

  if (conversations.length === 0) {
    return {};
  }

  const entries = await Promise.all(
    conversations.map(async (conversation) => {
      const peerId =
        conversation.userLowId === userId
          ? conversation.userHighId
          : conversation.userLowId;
      const lastReadAt = conversation.reads[0]?.lastReadAt ?? new Date(0);
      const count = await prisma.directMessage.count({
        where: {
          conversationId: conversation.id,
          authorId: peerId,
          createdAt: { gt: lastReadAt },
        },
      });
      return [peerId, count] as const;
    }),
  );

  const result: Record<string, number> = {};
  for (const [peerId, count] of entries) {
    if (count > 0) {
      result[peerId] = count;
    }
  }
  return result;
}

export async function countUnreadChatMessages(userId: string) {
  const [teamUnread, dmUnread] = await Promise.all([
    countUnreadTeamMessages(userId),
    countUnreadDirectMessages(userId),
  ]);

  return teamUnread + dmUnread;
}

export async function markChatTeamRead(userId: string, teamId: string) {
  const now = new Date();

  await prisma.chatTeamRead.upsert({
    where: {
      userId_teamId: { userId, teamId },
    },
    create: {
      userId,
      teamId,
      lastReadAt: now,
    },
    update: {
      lastReadAt: now,
    },
  });
}

export async function markDirectConversationRead(
  userId: string,
  conversationId: string,
) {
  const now = new Date();

  await prisma.directConversationRead.upsert({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    create: {
      userId,
      conversationId,
      lastReadAt: now,
    },
    update: {
      lastReadAt: now,
    },
  });
}
