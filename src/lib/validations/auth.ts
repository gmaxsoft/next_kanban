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
  roleId: z.string().uuid("Wybierz rolę"),
  teamId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const updateUserSchema = z.object({
  userId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, "Imię i nazwisko musi mieć co najmniej 2 znaki")
    .max(80, "Imię i nazwisko może mieć maksymalnie 80 znaków"),
  email: z.email("Podaj prawidłowy adres e-mail"),
  roleId: z.string().uuid().optional(),
  teamId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value.length > 0 ? value : null,
    ),
  isActive: z.enum(["true", "false"]).optional(),
  password: z
    .union([
      z.literal(""),
      z
        .string()
        .min(8, "Hasło musi mieć co najmniej 8 znaków")
        .max(72, "Hasło może mieć maksymalnie 72 znaki"),
    ])
    .optional(),
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

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nazwa roli musi mieć co najmniej 2 znaki")
    .max(60, "Nazwa roli może mieć maksymalnie 60 znaków"),
  isAdmin: z.enum(["true", "false"]).default("false"),
});

export const updateRoleSchema = roleSchema.extend({
  roleId: z.string().uuid(),
});

export const teamSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nazwa zespołu musi mieć co najmniej 2 znaki")
      .max(80, "Nazwa zespołu może mieć maksymalnie 80 znaków"),
    description: z
      .string()
      .trim()
      .max(255, "Opis może mieć maksymalnie 255 znaków")
      .optional(),
    inboundEmail: z.union([
      z.literal(""),
      z.string().trim().email("Podaj poprawny adres e-mail skrzynki").max(255),
    ]),
    inboundType: z.enum(["WEBHOOK", "IMAP"]).default("WEBHOOK"),
    imapHost: z.union([z.literal(""), z.string().trim().max(255)]),
    imapPort: z.coerce.number().int().min(1).max(65535).default(993),
    imapUser: z.union([z.literal(""), z.string().trim().max(255)]),
    imapPassword: z.union([z.literal(""), z.string().max(255)]),
    imapSecure: z.enum(["true", "false"]).default("true"),
    imapMailbox: z.union([z.literal(""), z.string().trim().max(120)]),
    keepImapPassword: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.inboundType !== "IMAP") {
      return;
    }

    if (!data.imapHost.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["imapHost"],
        message: "Podaj host IMAP.",
      });
    }
    if (!data.imapUser.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["imapUser"],
        message: "Podaj użytkownika IMAP.",
      });
    }
    if (!data.imapPassword && !data.keepImapPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["imapPassword"],
        message: "Podaj hasło IMAP.",
      });
    }
  });

export const updateTeamSchema = teamSchema.extend({
  teamId: z.string().uuid(),
});

export function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Nieprawidłowe dane.";
}
