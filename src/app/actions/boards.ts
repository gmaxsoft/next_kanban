"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { normalizeRichTextInput } from "@/lib/rich-text";
import {
  createBoardSchema,
  createTaskSchema,
  moveTaskSchema,
} from "@/lib/validations/board";
import { firstZodError } from "@/lib/validations/auth";

export type BoardActionState = {
  error?: string;
  success?: string;
} | null;

export async function createBoard(
  _prevState: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const session = await requireAuth();

  if (!session.user.isAdmin) {
    return { error: "Tylko ADMINISTRATOR może tworzyć tablice." };
  }

  const parsed = createBoardSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    columns: formData
      .getAll("column")
      .map((value) => String(value).trim())
      .filter(Boolean),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const team = await prisma.team.findUnique({
    where: { id: parsed.data.teamId },
    select: { id: true },
  });

  if (!team) {
    return { error: "Nie znaleziono wybranego zespołu." };
  }

  const board = await prisma.board.create({
    data: {
      title: parsed.data.title,
      teamId: parsed.data.teamId,
      createdById: session.user.id,
      columns: {
        create: parsed.data.columns.map((title, order) => ({
          title,
          order,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/");
  revalidatePath("/boards");
  redirect(`/boards/${board.id}`);
}

export async function createTask(
  _prevState: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const session = await requireAuth();

  if (!session.user.isAdmin) {
    return { error: "Tylko ADMINISTRATOR może dodawać zadania." };
  }

  const description = normalizeRichTextInput(
    String(formData.get("description") ?? ""),
  );
  const assigneeIds = formData
    .getAll("assigneeIds")
    .map((value) => String(value))
    .filter(Boolean);

  const parsed = createTaskSchema.safeParse({
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
      board: { select: { teamId: true } },
    },
  });

  if (!column || column.boardId !== parsed.data.boardId) {
    return { error: "Nie znaleziono kolumny na tej tablicy." };
  }

  if (parsed.data.assigneeIds.length > 0) {
    const users = await prisma.user.count({
      where: {
        id: { in: parsed.data.assigneeIds },
        isActive: true,
        teamId: column.board.teamId,
      },
    });

    if (users !== parsed.data.assigneeIds.length) {
      return {
        error: "Możesz przypisać tylko aktywnych członków zespołu tablicy.",
      };
    }
  }

  const aggregate = await prisma.task.aggregate({
    where: { columnId: column.id },
    _max: { order: true },
  });

  await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      order: (aggregate._max.order ?? -1) + 1,
      columnId: column.id,
      createdById: session.user.id,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assignments:
        parsed.data.assigneeIds.length > 0
          ? {
              create: parsed.data.assigneeIds.map((userId) => ({ userId })),
            }
          : undefined,
    },
  });

  revalidatePath("/");
  revalidatePath("/boards");
  revalidatePath("/tasks");
  revalidatePath(`/boards/${column.boardId}`);

  return { success: "Dodano zadanie." };
}

export async function moveTask(input: {
  boardId: string;
  taskId: string;
  toColumnId: string;
  toIndex: number;
}) {
  await requireAuth();

  const parsed = moveTaskSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { boardId, taskId, toColumnId, toIndex } = parsed.data;

  const [task, destColumn] = await Promise.all([
    prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { select: { boardId: true } } },
    }),
    prisma.column.findUnique({
      where: { id: toColumnId },
      select: { id: true, boardId: true },
    }),
  ]);

  if (
    !task ||
    !destColumn ||
    task.column.boardId !== boardId ||
    destColumn.boardId !== boardId
  ) {
    return { error: "Nie znaleziono zadania lub kolumny." };
  }

  const fromColumnId = task.columnId;

  await prisma.$transaction(async (tx) => {
    const fromTasks = await tx.task.findMany({
      where: { columnId: fromColumnId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const destTasks =
      fromColumnId === toColumnId
        ? fromTasks
        : await tx.task.findMany({
            where: { columnId: toColumnId },
            orderBy: { order: "asc" },
            select: { id: true },
          });

    const fromIds = fromTasks.map((item) => item.id).filter((id) => id !== taskId);
    const toIds = (
      fromColumnId === toColumnId ? fromIds : destTasks.map((item) => item.id)
    ).filter((id) => id !== taskId);

    const insertAt = Math.max(0, Math.min(toIndex, toIds.length));
    toIds.splice(insertAt, 0, taskId);

    const updates =
      fromColumnId === toColumnId
        ? toIds.map((id, order) =>
            tx.task.update({ where: { id }, data: { order } }),
          )
        : [
            ...fromIds.map((id, order) =>
              tx.task.update({ where: { id }, data: { order } }),
            ),
            ...toIds.map((id, order) =>
              tx.task.update({
                where: { id },
                data: { columnId: toColumnId, order },
              }),
            ),
          ];

    await Promise.all(updates);
  });

  revalidatePath(`/boards/${boardId}`);
  return { success: true };
}
