"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
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

  if (session.user.role !== "ADMIN") {
    return { error: "Tylko administrator może tworzyć tablice." };
  }

  const parsed = createBoardSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    columns: formData
      .getAll("column")
      .map((value) => String(value).trim())
      .filter(Boolean),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const board = await prisma.board.create({
    data: {
      title: parsed.data.title,
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
  const description = String(formData.get("description") ?? "").trim();

  const parsed = createTaskSchema.safeParse({
    boardId: String(formData.get("boardId") ?? ""),
    columnId: String(formData.get("columnId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: description || undefined,
    priority: formData.get("priority") || "MEDIUM",
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const column = await prisma.column.findUnique({
    where: { id: parsed.data.columnId },
    select: { id: true, boardId: true },
  });

  if (!column || column.boardId !== parsed.data.boardId) {
    return { error: "Nie znaleziono kolumny na tej tablicy." };
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
    },
  });

  revalidatePath("/");
  revalidatePath("/boards");
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
