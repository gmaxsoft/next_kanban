import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AssignBoardOption,
  AssignMemberOption,
  AssignTeamOption,
  AssignedTaskRow,
  BoardColumn,
  BoardMember,
  BoardSummary,
  TaskDetails,
} from "@/lib/kanban";
import type {
  BoardsListFilters,
  PaginationMeta,
  PaginationState,
  TasksListFilters,
} from "@/lib/list-query";
import { buildPaginationMeta } from "@/lib/list-query";

export type BoardTaskFilters = {
  q?: string;
  assignee?: string;
};

const assigneeSelect = {
  select: { id: true, name: true, avatarUrl: true },
} as const;

function taskWhere(filters: BoardTaskFilters): Prisma.TaskWhereInput | undefined {
  const where: Prisma.TaskWhereInput = {};
  const query = filters.q?.trim();

  if (query) {
    where.title = { contains: query };
  }

  if (filters.assignee === "unassigned") {
    where.assignments = { none: {} };
  } else if (filters.assignee) {
    where.assignments = { some: { userId: filters.assignee } };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export async function listBoards(
  filters: Partial<BoardsListFilters> = {},
  pagination: PaginationState = { page: 1, pageSize: 15 },
): Promise<{ items: BoardSummary[]; meta: PaginationMeta }> {
  const query = filters.q?.trim();
  const where = {
    ...(query ? { title: { contains: query } } : {}),
    ...(filters.team ? { teamId: filters.team } : {}),
  };

  const total = await prisma.board.count({ where });
  const meta = buildPaginationMeta(total, pagination);

  const boards = await prisma.board.findMany({
    where,
    skip: meta.skip,
    take: meta.take,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      team: { select: { id: true, name: true } },
      columns: {
        select: {
          _count: { select: { tasks: true } },
        },
      },
    },
  });

  return {
    meta,
    items: boards.map((board) => ({
      id: board.id,
      title: board.title,
      createdAt: board.createdAt,
      createdByName: board.createdBy.name,
      teamId: board.team.id,
      teamName: board.team.name,
      columnCount: board.columns.length,
      taskCount: board.columns.reduce(
        (sum, column) => sum + column._count.tasks,
        0,
      ),
    })),
  };
}

export async function listTeams(): Promise<AssignTeamOption[]> {
  return prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listAssignBoards(): Promise<AssignBoardOption[]> {
  const boards = await prisma.board.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      teamId: true,
      columns: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  return boards;
}

export async function listAssignMembers(): Promise<AssignMemberOption[]> {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, avatarUrl: true, teamId: true },
    orderBy: { name: "asc" },
  });
}

export async function listAssignedTasks(
  filters: Partial<TasksListFilters> = {},
  pagination: PaginationState = { page: 1, pageSize: 15 },
): Promise<{ items: AssignedTaskRow[]; meta: PaginationMeta }> {
  const query = filters.q?.trim();
  const where = {
    ...(query ? { title: { contains: query } } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    column: {
      board: {
        ...(filters.board ? { id: filters.board } : {}),
        ...(filters.team ? { teamId: filters.team } : {}),
      },
    },
  };

  const total = await prisma.task.count({ where });
  const meta = buildPaginationMeta(total, pagination);

  const tasks = await prisma.task.findMany({
    where,
    skip: meta.skip,
    take: meta.take,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      column: {
        select: {
          title: true,
          board: {
            select: {
              id: true,
              title: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
      },
      assignments: {
        include: { user: assigneeSelect },
      },
    },
  });

  return {
    meta,
    items: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      boardId: task.column.board.id,
      boardTitle: task.column.board.title,
      teamId: task.column.board.team.id,
      teamName: task.column.board.team.name,
      columnTitle: task.column.title,
      assignees: task.assignments.map((assignment) => assignment.user),
    })),
  };
}

export async function listBoardMembers(teamId?: string): Promise<BoardMember[]> {
  return prisma.user.findMany({
    where: {
      isActive: true,
      ...(teamId ? { teamId } : {}),
    },
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
      team: { select: { id: true, name: true } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            where,
            orderBy: { order: "asc" },
            include: {
              assignments: {
                include: { user: assigneeSelect },
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
      assignments: {
        include: { user: assigneeSelect },
      },
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

  const assignees = task.assignments.map((assignment) => assignment.user);

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    assigneeIds: assignees.map((assignee) => assignee.id),
    assignees,
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
      dueDate: task.dueDate?.toISOString() ?? null,
      assignees: task.assignments.map((assignment) => assignment.user),
    })),
  }));
}
