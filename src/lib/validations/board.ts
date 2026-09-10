import { z } from "zod";

export const DEFAULT_BOARD_COLUMNS = [
  "To Do",
  "In Progress",
  "Code Review",
  "Done",
] as const;

export const createBoardSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Tytuł tablicy musi mieć co najmniej 2 znaki")
    .max(80, "Tytuł może mieć maksymalnie 80 znaków"),
  columns: z
    .array(z.string().trim().min(1).max(40))
    .min(2, "Dodaj co najmniej dwie kolumny")
    .max(12, "Maksymalnie 12 kolumn"),
});

export const createTaskSchema = z.object({
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Tytuł zadania jest wymagany")
    .max(120, "Tytuł może mieć maksymalnie 120 znaków"),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const moveTaskSchema = z.object({
  boardId: z.string().uuid(),
  taskId: z.string().uuid(),
  toColumnId: z.string().uuid(),
  toIndex: z.number().int().min(0),
});
