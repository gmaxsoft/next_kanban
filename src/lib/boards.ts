import { prisma } from "@/lib/prisma";
import type { BoardColumn, BoardSummary } from "@/lib/kanban";

export async function listBoards(): Promise<BoardSummary[]> {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      columns: {
        select: {
          _count: { select: { tasks: true } },
        },
      },
    },
  });

  return boards.map((board) => ({
    id: board.id,
    title: board.title,
    createdAt: board.createdAt,
    createdByName: board.createdBy.name,
    columnCount: board.columns.length,
    taskCount: board.columns.reduce((sum, column) => sum + column._count.tasks, 0),
  }));
}

export async function getBoardWithColumns(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      createdBy: { select: { name: true } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              assignee: {
                select: { name: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  });
}

export function mapBoardColumns(
  board: NonNullable<Awaited<ReturnType<typeof getBoardWithColumns>>>,
): BoardColumn[] {
  return board.columns.map((column) => ({
    id: column.id,
    title: column.title,
    tasks: column.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
      priority: task.priority,
      assignee: task.assignee
        ? {
            name: task.assignee.name,
            avatarUrl: task.assignee.avatarUrl,
          }
        : undefined,
    })),
  }));
}
