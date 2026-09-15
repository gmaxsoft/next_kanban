import { prisma } from "@/lib/prisma";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  if (!input.userId) {
    return null;
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 500),
      href: input.href?.slice(0, 255) ?? null,
    },
  });
}

export async function createNotifications(
  userIds: string[],
  input: { title: string; body: string; href?: string | null },
) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 500),
      href: input.href?.slice(0, 255) ?? null,
    })),
  });
}

export async function listNotifications(
  userId: string,
  take = 20,
): Promise<AppNotification[]> {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    href: item.href,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function ensureDemoNotifications(userId: string, userName: string) {
  const existing = await prisma.notification.count({ where: { userId } });

  if (existing > 0) {
    return;
  }

  await prisma.notification.createMany({
    data: [
      {
        userId,
        title: "Witaj w Next Kanban",
        body: `Cześć ${userName}! To przykładowe powiadomienie — dzwoneczek działa.`,
        href: "/",
      },
      {
        userId,
        title: "Przypomnienie o zadaniach",
        body: "Sprawdź przypisane zadania i terminy na pulpicie.",
        href: "/",
      },
    ],
  });
}
