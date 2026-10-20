"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireAuth } from "@/lib/auth-utils";
import { taskPath } from "@/lib/board-query";
import { notifyTaskParticipants } from "@/lib/task-notifications";
import { notifyTaskCommented } from "@/lib/mail";
import { extractMentionedUserIds } from "@/lib/mentions";
import { createNotifications } from "@/lib/notifications";
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

export async function reorderTasks(
  orderedIds: string[],
): Promise<TaskActionState> {
  const session = await requireAuth();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { error: "Brak kolejności zadań." };
  }

  const uniqueIds = [...new Set(orderedIds.map(String).filter(Boolean))];
  if (uniqueIds.length !== orderedIds.length) {
    return { error: "Nieprawidłowa kolejność zadań." };
  }

  const tasks = await prisma.task.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      column: { select: { board: { select: { teamId: true } } } },
    },
  });

  if (tasks.length !== uniqueIds.length) {
    return { error: "Nie znaleziono wszystkich zadań." };
  }

  if (!session.user.isAdmin) {
    const unauthorized = tasks.some(
      (task) => task.column.board.teamId !== session.user.teamId,
    );
    if (unauthorized) {
      return { error: "Nie masz dostępu do tych zadań." };
    }
  }

  const chunkSize = 100;
  for (let offset = 0; offset < uniqueIds.length; offset += chunkSize) {
    const chunk = uniqueIds.slice(offset, offset + chunkSize);
    await prisma.$transaction(
      chunk.map((id, indexInChunk) =>
        prisma.task.update({
          where: { id },
          data: { listOrder: offset + indexInChunk },
        }),
      ),
    );
  }

  revalidatePath("/tasks");
  return { success: "Zapisano kolejność zadań." };
}

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

  await notifyTaskParticipants({
    taskId: task.id,
    actorId: session.user.id,
    title: "Przypisano Ci zadanie",
    body: `Przypisano zadanie „${parsed.data.title}” na tablicy ${column.board.title}.`,
  });
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
  const watcherIds = [...new Set(formData.getAll("watcherIds").map(String).filter(Boolean))];

  const parsed = updateTaskSchema.safeParse({
    boardId: String(formData.get("boardId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: normalizeRichTextInput(
      String(formData.get("description") ?? ""),
    ),
    priority: String(formData.get("priority") ?? ""),
    assigneeIds,
    watcherIds,
    requestedBy: String(formData.get("requestedBy") ?? "").trim().slice(0, 255),
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
      watchers: { select: { userId: true } },
    },
  });

  if (!task) {
    return { error: "Nie znaleziono zadania na tej tablicy." };
  }

  if (!isAdmin && task.column.board.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do zadań tego zespołu." };
  }

  const taskMemberWhere = {
    id: { in: parsed.data.assigneeIds ?? [] },
    isActive: true,
    teamId: task.column.board.teamId,
  };
  const watcherMemberWhere = {
    id: { in: parsed.data.watcherIds ?? [] },
    isActive: true,
    teamId: task.column.board.teamId,
  };
  if (parsed.data.assigneeIds) {
    const validCount = await prisma.user.count({ where: taskMemberWhere });
    if (validCount !== parsed.data.assigneeIds.length) {
      return { error: "Możesz przypisać tylko aktywnych członków zespołu tablicy." };
    }
  }
  if (parsed.data.watcherIds) {
    const validCount = await prisma.user.count({ where: watcherMemberWhere });
    if (validCount !== parsed.data.watcherIds.length) {
      return { error: "Wybierz aktywnych obserwujących z zespołu tablicy." };
    }
  }

  const currentAssigneeIds = task.assignments.map((assignment) => assignment.userId);
  const currentWatcherIds = task.watchers.map((watcher) => watcher.userId);
  const nextAssigneeIds = parsed.data.assigneeIds ?? currentAssigneeIds;
  const nextWatcherIds = parsed.data.watcherIds ?? currentWatcherIds;
  const sameIds = (left: string[], right: string[]) =>
    left.length === right.length && left.every((id) => right.includes(id));
  const participantsChanged =
    !sameIds(currentAssigneeIds, nextAssigneeIds) ||
    !sameIds(currentWatcherIds, nextWatcherIds);

  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description.trim() || null,
      priority: parsed.data.priority,
      requestedBy: parsed.data.requestedBy || null,
      ...(isAdmin && parsed.data.dueDate !== undefined
        ? {
            dueDate: parsed.data.dueDate
              ? new Date(parsed.data.dueDate)
              : null,
          }
        : {}),
    },
  });

  if (parsed.data.assigneeIds) {
    await replaceAssignees(task.id, nextAssigneeIds);
  }
  if (parsed.data.watcherIds) {
    await prisma.$transaction([
      prisma.taskWatcher.deleteMany({ where: { taskId: task.id } }),
      ...(nextWatcherIds.length
        ? [
            prisma.taskWatcher.createMany({
              data: nextWatcherIds.map((userId) => ({ taskId: task.id, userId })),
            }),
          ]
        : []),
    ]);
  }
  await notifyTaskParticipants({
    taskId: task.id,
    actorId: session.user.id,
    title: participantsChanged ? "Zmieniono osoby przy zadaniu" : "Zaktualizowano zadanie",
    body: `Zadanie „${parsed.data.title}” zostało zaktualizowane.`,
  });  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/boards");
  revalidatePath("/tasks");
  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath(`/boards/${parsed.data.boardId}/tasks/${parsed.data.taskId}`);

  return { success: "Zapisano zmiany w zadaniu." };
}

export async function uploadTaskAttachment(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAuth();
  const boardId = String(formData.get("boardId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const file = formData.get("file");

  if (!boardId || !taskId || !(file instanceof File) || file.size === 0) {
    return { error: "Wybierz plik do przesłania." };
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, column: { boardId } },
    select: {
      id: true,
      column: { select: { board: { select: { teamId: true } } } },
    },
  });

  if (!task) {
    return { error: "Nie znaleziono zadania." };
  }
  if (
    !session.user.isAdmin &&
    task.column.board.teamId !== session.user.teamId
  ) {
    return { error: "Nie masz dostępu do tego zadania." };
  }

  try {
    const { storeTaskAttachment } = await import(
      "@/lib/task-attachments.server"
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    await storeTaskAttachment({
      taskId,
      uploadedById: session.user.id,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      content: buffer,
    });
  } catch (error) {
    console.error("[tasks] attachment upload failed", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać załącznika.",
    };
  }

  revalidatePath(`/boards/${boardId}/tasks/${taskId}`);
  return { success: "Dodano załącznik." };
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
      watchers: { select: { userId: true } },
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

  if (!session.user.isAdmin && task.column.board.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do zadań tego zespołu." };
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
  const href = taskPath(task.column.boardId, task.id);
  const commentPreview = parsed.data.content.slice(0, 120);
  const participantIds = new Set([
    ...task.assignments.map((assignment) => assignment.user.id),
    ...task.watchers.map((watcher) => watcher.userId),
  ]);
  participantIds.delete(session.user.id);

  await notifyTaskParticipants({
    taskId: task.id,
    actorId: session.user.id,
    title: "Nowy komentarz w zadaniu",
    body: `${actorName}: ${parsed.data.content.slice(0, 350)}`,
  });

  const mentionOnlyIds = mentionedIds.filter(
    (id) => id !== session.user.id && !participantIds.has(id),
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
