"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth-utils";
import {
  notifyTaskAssigned,
  notifyTaskCommented,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { addCommentSchema, updateTaskSchema } from "@/lib/validations/board";
import { firstZodError } from "@/lib/validations/auth";

export type TaskActionState = {
  error?: string;
  success?: string;
} | null;

export async function updateTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAuth();

  const parsed = updateTaskSchema.safeParse({
    boardId: String(formData.get("boardId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    assigneeId: String(formData.get("assigneeId") ?? ""),
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
      assigneeId: true,
      column: {
        select: {
          boardId: true,
          board: { select: { title: true } },
        },
      },
    },
  });

  if (!task) {
    return { error: "Nie znaleziono zadania na tej tablicy." };
  }

  const assigneeId =
    !parsed.data.assigneeId || parsed.data.assigneeId === "unassigned"
      ? null
      : parsed.data.assigneeId;

  const assignee =
    assigneeId === null
      ? null
      : await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, name: true, email: true },
        });

  if (assigneeId && !assignee) {
    return { error: "Nie znaleziono przypisanego użytkownika." };
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description.trim() || null,
      priority: parsed.data.priority,
      assigneeId,
    },
  });

  const assignedSomeoneNew =
    Boolean(assignee) && assigneeId !== task.assigneeId;

  if (assignedSomeoneNew && assignee && assignee.id !== session.user.id) {
    notifyTaskAssigned({
      toEmail: assignee.email,
      assigneeName: assignee.name,
      actorName: session.user.name ?? session.user.email ?? "Ktoś z zespołu",
      taskTitle: parsed.data.title,
      boardTitle: task.column.board.title,
      boardId: task.column.boardId,
      taskId: task.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/boards");
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return { success: "Zapisano zmiany w zadaniu." };
}

export async function addComment(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAuth();

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
      assigneeId: true,
      assignee: { select: { id: true, name: true, email: true } },
      column: {
        select: {
          boardId: true,
          board: { select: { title: true } },
        },
      },
    },
  });

  if (!task) {
    return { error: "Nie znaleziono zadania na tej tablicy." };
  }

  await prisma.comment.create({
    data: {
      content: parsed.data.content,
      taskId: task.id,
      authorId: session.user.id,
    },
  });

  if (task.assignee && task.assignee.id !== session.user.id) {
    notifyTaskCommented({
      toEmail: task.assignee.email,
      assigneeName: task.assignee.name,
      actorName: session.user.name ?? session.user.email ?? "Ktoś z zespołu",
      taskTitle: task.title,
      boardTitle: task.column.board.title,
      comment: parsed.data.content,
      boardId: task.column.boardId,
      taskId: task.id,
    });
  }

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return { success: "Dodano komentarz." };
}
