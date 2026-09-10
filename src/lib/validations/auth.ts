import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Podaj prawidłowy adres e-mail"),
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .max(72, "Hasło może mieć maksymalnie 72 znaki"),
});

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Imię i nazwisko musi mieć co najmniej 2 znaki")
    .max(80, "Imię i nazwisko może mieć maksymalnie 80 znaków"),
  email: z.email("Podaj prawidłowy adres e-mail"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(72, "Hasło może mieć maksymalnie 72 znaki"),
  role: z.enum(["ADMIN", "USER"]),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Podaj obecne hasło"),
    newPassword: z
      .string()
      .min(8, "Nowe hasło musi mieć co najmniej 8 znaków")
      .max(72, "Hasło może mieć maksymalnie 72 znaki"),
    confirmPassword: z.string().min(1, "Potwierdź nowe hasło"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Nowe hasło musi różnić się od obecnego",
    path: ["newPassword"],
  });

export function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Nieprawidłowe dane.";
}
