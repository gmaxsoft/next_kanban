"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { addCommentSchema, updateTaskSchema } from "@/lib/validations/board";
import { firstZodError } from "@/lib/validations/auth";

export type TaskActionState = {
  error?: string;
  success?: string;
} | null;

async function findTaskOnBoard(boardId: string, taskId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      column: { boardId },
    },
    select: { id: true, column: { select: { boardId: true } } },
  });
}

export async function updateTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  await requireAuth();

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

  const task = await findTaskOnBoard(parsed.data.boardId, parsed.data.taskId);

  if (!task) {
    return { error: "Nie znaleziono zadania na tej tablicy." };
  }

  const assigneeId =
    !parsed.data.assigneeId || parsed.data.assigneeId === "unassigned"
      ? null
      : parsed.data.assigneeId;

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true },
    });

    if (!assignee) {
      return { error: "Nie znaleziono przypisanego użytkownika." };
    }
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

  const task = await findTaskOnBoard(parsed.data.boardId, parsed.data.taskId);

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

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return { success: "Dodano komentarz." };
}
