import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  BoardColumn,
  BoardMember,
  BoardSummary,
  TaskDetails,
} from "@/lib/kanban";

export type BoardTaskFilters = {
  q?: string;
  assignee?: string;
};

function taskWhere(filters: BoardTaskFilters): Prisma.TaskWhereInput | undefined {
  const where: Prisma.TaskWhereInput = {};
  const query = filters.q?.trim();

  if (query) {
    where.title = { contains: query };
  }

  if (filters.assignee === "unassigned") {
    where.assigneeId = null;
  } else if (filters.assignee) {
    where.assigneeId = filters.assignee;
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

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

export async function listBoardMembers(): Promise<BoardMember[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}

export async function getBoardWithColumns(
  boardId: string,
  filters: BoardTaskFilters = {},
) {
  const where = taskWhere(filters);

  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      createdBy: { select: { name: true } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            where,
            orderBy: { order: "asc" },
            include: {
              assignee: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getTaskDetails(
  boardId: string,
  taskId: string,
): Promise<TaskDetails | null> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      column: { boardId },
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { name: true } },
      column: { select: { title: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    assigneeId: task.assigneeId,
    columnTitle: task.column.title,
    createdByName: task.createdBy.name,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
    })),
  };
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
      assigneeId: task.assigneeId,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
            avatarUrl: task.assignee.avatarUrl,
          }
        : undefined,
    })),
  }));
}
