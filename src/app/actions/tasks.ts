"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireAuth } from "@/lib/auth-utils";
import { taskPath } from "@/lib/board-query";
import {
  notifyTaskAssigned,
  notifyTaskCommented,
} from "@/lib/mail";
import { extractMentionedUserIds } from "@/lib/mentions";
import { createNotification, createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { normalizeRichTextInput } from "@/lib/rich-text";
import {
  addCommentSchema,
  assignTaskSchema,
  updateTaskSchema,
} from "@/lib/validations/board";
import { firstZodError } from "@/lib/validations/auth";

export type TaskActionState = {
  error?: string;
  success?: string;
} | null;

async function replaceAssignees(taskId: string, assigneeIds: string[]) {
  await prisma.$transaction([
    prisma.taskAssignee.deleteMany({ where: { taskId } }),
    ...(assigneeIds.length > 0
      ? [
          prisma.taskAssignee.createMany({
            data: assigneeIds.map((userId) => ({ taskId, userId })),
          }),
        ]
      : []),
  ]);
}

export async function assignTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAdmin();
  const description = normalizeRichTextInput(
    String(formData.get("description") ?? ""),
  );
  const assigneeIds = formData
    .getAll("assigneeIds")
    .map((value) => String(value))
    .filter(Boolean);

  const parsed = assignTaskSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    boardId: String(formData.get("boardId") ?? ""),
    columnId: String(formData.get("columnId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: description || undefined,
    priority: formData.get("priority") || "MEDIUM",
    assigneeIds,
    dueDate: String(formData.get("dueDate") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const column = await prisma.column.findUnique({
    where: { id: parsed.data.columnId },
    select: {
      id: true,
      boardId: true,
      board: { select: { title: true, teamId: true } },
    },
  });

  if (
    !column ||
    column.boardId !== parsed.data.boardId ||
    column.board.teamId !== parsed.data.teamId
  ) {
    return { error: "Nie znaleziono statusu na wybranej tablicy zespołu." };
  }

  const assignees = await prisma.user.findMany({
    where: {
      id: { in: parsed.data.assigneeIds },
      isActive: true,
      teamId: parsed.data.teamId,
    },
    select: { id: true, name: true, email: true },
  });

  if (assignees.length !== parsed.data.assigneeIds.length) {
    return {
      error: "Możesz przypisać tylko aktywnych członków wybranego zespołu.",
    };
  }

  const aggregate = await prisma.task.aggregate({
    where: { columnId: column.id },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      order: (aggregate._max.order ?? -1) + 1,
      columnId: column.id,
      createdById: session.user.id,
      dueDate: new Date(parsed.data.dueDate),
      assignments: {
        create: parsed.data.assigneeIds.map((userId) => ({ userId })),
      },
    },
    select: { id: true },
  });

  const actorName = session.user.name ?? session.user.email ?? "Administrator";

  for (const assignee of assignees) {
    if (assignee.id === session.user.id) {
      continue;
    }

    notifyTaskAssigned({
      toEmail: assignee.email,
      assigneeName: assignee.name,
      actorName,
      taskTitle: parsed.data.title,
      boardTitle: column.board.title,
      boardId: column.boardId,
      taskId: task.id,
    });

    await createNotification({
      userId: assignee.id,
      title: "Przypisano Ci zadanie",
      body: `${actorName} przydzielił(a) Ci „${parsed.data.title}” na tablicy ${column.board.title}.`,
      href: taskPath(column.boardId, task.id),
    });
  }

  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/boards");
  revalidatePath("/tasks");
  revalidatePath(`/boards/${column.boardId}`);

  return { success: "Przydzielono zadanie załodze." };
}

export async function updateTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAuth();
  const isAdmin = session.user.isAdmin;
  const assigneeIds = formData
    .getAll("assigneeIds")
    .map((value) => String(value))
    .filter(Boolean);

  const parsed = updateTaskSchema.safeParse({
    boardId: String(formData.get("boardId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: normalizeRichTextInput(
      String(formData.get("description") ?? ""),
    ),
    priority: String(formData.get("priority") ?? ""),
    assigneeIds: isAdmin ? assigneeIds : undefined,
    dueDate: isAdmin ? String(formData.get("dueDate") ?? "") : undefined,
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const task = await prisma.task.findFirst({
    where: {
      id: parsed.data.taskId,
      column: { boardId: parsed.data.boardId },
    },
    select: {
      id: true,
      title: true,
      column: {
        select: {
          boardId: true,
          board: { select: { title: true, teamId: true } },
        },
      },
      assignments: { select: { userId: true } },
    },
  });

  if (!task) {
    return { error: "Nie znaleziono zadania na tej tablicy." };
  }

  const previousAssigneeIds = new Set(
    task.assignments.map((assignment) => assignment.userId),
  );

  let nextAssignees:
    | { id: string; name: string; email: string }[]
    | null = null;

  if (isAdmin && parsed.data.assigneeIds) {
    nextAssignees = await prisma.user.findMany({
      where: {
        id: { in: parsed.data.assigneeIds },
        isActive: true,
        teamId: task.column.board.teamId,
      },
      select: { id: true, name: true, email: true },
    });

    if (nextAssignees.length !== parsed.data.assigneeIds.length) {
      return {
        error: "Możesz przypisać tylko aktywnych członków zespołu tablicy.",
      };
    }
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description.trim() || null,
      priority: parsed.data.priority,
      ...(isAdmin && parsed.data.dueDate !== undefined
        ? {
            dueDate: parsed.data.dueDate
              ? new Date(parsed.data.dueDate)
              : null,
          }
        : {}),
    },
  });

  if (isAdmin && parsed.data.assigneeIds && nextAssignees) {
    await replaceAssignees(task.id, parsed.data.assigneeIds);

    const actorName =
      session.user.name ?? session.user.email ?? "Ktoś z zespołu";

    for (const assignee of nextAssignees) {
      if (
        previousAssigneeIds.has(assignee.id) ||
        assignee.id === session.user.id
      ) {
        continue;
      }

      notifyTaskAssigned({
        toEmail: assignee.email,
        assigneeName: assignee.name,
        actorName,
        taskTitle: parsed.data.title,
        boardTitle: task.column.board.title,
        boardId: task.column.boardId,
        taskId: task.id,
      });

      await createNotification({
        userId: assignee.id,
        title: "Przypisano Ci zadanie",
        body: `${actorName} przydzielił(a) Ci „${parsed.data.title}” na tablicy ${task.column.board.title}.`,
        href: taskPath(task.column.boardId, task.id),
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/boards");
  revalidatePath("/tasks");
  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath(`/boards/${parsed.data.boardId}/tasks/${parsed.data.taskId}`);

  return { success: "Zapisano zmiany w zadaniu." };
}

export async function addComment(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAuth();
  const explicitMentionIds = formData
    .getAll("mentionedIds")
    .map((value) => String(value))
    .filter(Boolean);

  const parsed = addCommentSchema.safeParse({
    boardId: String(formData.get("boardId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    content: String(formData.get("content") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const task = await prisma.task.findFirst({
    where: {
      id: parsed.data.taskId,
      column: { boardId: parsed.data.boardId },
    },
    select: {
      id: true,
      title: true,
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      column: {
        select: {
          boardId: true,
          board: {
            select: {
              title: true,
              teamId: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return { error: "Nie znaleziono zadania na tej tablicy." };
  }

  const teamMembers = await prisma.user.findMany({
    where: {
      isActive: true,
      teamId: task.column.board.teamId,
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const mentionedIds = extractMentionedUserIds(
    parsed.data.content,
    teamMembers,
    explicitMentionIds,
  );

  await prisma.comment.create({
    data: {
      content: parsed.data.content,
      taskId: task.id,
      authorId: session.user.id,
    },
  });

  const actorName = session.user.name ?? session.user.email ?? "Ktoś z zespołu";
  const notified = new Set<string>();
  const href = taskPath(task.column.boardId, task.id);
  const commentPreview = parsed.data.content.slice(0, 120);

  for (const assignment of task.assignments) {
    if (assignment.user.id === session.user.id) {
      continue;
    }

    const mentioned = mentionedIds.includes(assignment.user.id);
    notified.add(assignment.user.id);
    notifyTaskCommented({
      toEmail: assignment.user.email,
      assigneeName: assignment.user.name,
      actorName,
      taskTitle: task.title,
      boardTitle: task.column.board.title,
      comment: parsed.data.content,
      boardId: task.column.boardId,
      taskId: task.id,
      mentioned,
    });

    await createNotification({
      userId: assignment.user.id,
      title: mentioned
        ? "Wspomniano Cię w komentarzu"
        : "Nowy komentarz w zadaniu",
      body: `${actorName}: ${commentPreview}`,
      href,
    });
  }

  const mentionOnlyIds = mentionedIds.filter(
    (id) => id !== session.user.id && !notified.has(id),
  );

  for (const member of teamMembers) {
    if (!mentionOnlyIds.includes(member.id)) {
      continue;
    }

    notifyTaskCommented({
      toEmail: member.email,
      assigneeName: member.name,
      actorName,
      taskTitle: task.title,
      boardTitle: task.column.board.title,
      comment: parsed.data.content,
      boardId: task.column.boardId,
      taskId: task.id,
      mentioned: true,
    });
  }

  if (mentionOnlyIds.length > 0) {
    await createNotifications(mentionOnlyIds, {
      title: "Wspomniano Cię w komentarzu",
      body: `${actorName}: ${commentPreview}`,
      href,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath(
    `/boards/${parsed.data.boardId}/tasks/${parsed.data.taskId}`,
  );

  return { success: "Dodano komentarz." };
}
