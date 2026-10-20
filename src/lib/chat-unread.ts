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

export async function countUnreadChatMessages(userId: string) {
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
