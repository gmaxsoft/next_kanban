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
  teamId: z.string().uuid("Wybierz zespół"),
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
  description: z.string().trim().max(20000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assigneeIds: z.array(z.string().uuid()).max(50).default([]),
  dueDate: z
    .union([z.iso.date("Nieprawidłowa data"), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const assignTaskSchema = z.object({
  teamId: z.string().uuid("Wybierz zespół"),
  boardId: z.string().uuid("Wybierz tablicę"),
  columnId: z.string().uuid("Wybierz status (kolumnę)"),
  title: z
    .string()
    .trim()
    .min(1, "Tytuł zadania jest wymagany")
    .max(120, "Tytuł może mieć maksymalnie 120 znaków"),
  description: z.string().trim().max(20000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assigneeIds: z
    .array(z.string().uuid())
    .min(1, "Wybierz co najmniej jedną osobę")
    .max(50),
  dueDate: z.iso.date("Nieprawidłowa data terminu"),
});

export const moveTaskSchema = z.object({
  boardId: z.string().uuid(),
  taskId: z.string().uuid(),
  toColumnId: z.string().uuid(),
  toIndex: z.number().int().min(0),
});

export const updateTaskSchema = z.object({
  boardId: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Tytuł zadania jest wymagany")
    .max(120, "Tytuł może mieć maksymalnie 120 znaków"),
  description: z
    .string()
    .max(20000, "Opis może mieć maksymalnie 20000 znaków"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  dueDate: z
    .union([z.iso.date("Nieprawidłowa data"), z.literal("")])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value.length > 0 ? value : null,
    ),
});

export const addCommentSchema = z.object({
  boardId: z.string().uuid(),
  taskId: z.string().uuid(),
  content: z
    .string()
    .trim()
    .min(1, "Komentarz nie może być pusty")
    .max(2000, "Komentarz może mieć maksymalnie 2000 znaków"),
});
