"use server";

import { requireAuth } from "@/lib/auth-utils";
import { taskPath } from "@/lib/board-query";
import { parseSearchQuery } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export type GlobalSearchBoardHit = {
  id: string;
  title: string;
  teamName: string;
  href: string;
};

export type GlobalSearchTaskHit = {
  id: string;
  title: string;
  boardTitle: string;
  href: string;
};

export type GlobalSearchResult = {
  boards: GlobalSearchBoardHit[];
  tasks: GlobalSearchTaskHit[];
};

export async function searchApp(rawQuery: string): Promise<GlobalSearchResult> {
  const session = await requireAuth();
  const query = parseSearchQuery(rawQuery);

  if (query.length < 2) {
    return { boards: [], tasks: [] };
  }

  const isAdmin = session.user.isAdmin;
  const userId = session.user.id;
  const teamId = session.user.teamId;

  const [boards, tasks] = await Promise.all([
    prisma.board.findMany({
      where: {
        title: { contains: query },
        ...(isAdmin ? {} : teamId ? { teamId } : { id: { in: [] } }),
      },
      take: 6,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        team: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        title: { contains: query },
        ...(isAdmin
          ? {}
          : {
              assignments: { some: { userId } },
            }),
      },
      take: 6,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        column: {
          select: {
            board: { select: { id: true, title: true } },
          },
        },
      },
    }),
  ]);

  return {
    boards: boards.map((board) => ({
      id: board.id,
      title: board.title,
      teamName: board.team.name,
      href: `/boards/${board.id}`,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      boardTitle: task.column.board.title,
      href: taskPath(task.column.board.id, task.id),
    })),
  };
}
