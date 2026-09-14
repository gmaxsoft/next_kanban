import { z } from "zod";

import { CHAT_UPLOAD_MAX_FILES, isAllowedChatMime } from "@/lib/chat-uploads";

const attachmentSchema = z.object({
  fileName: z.string().min(1).max(200),
  originalName: z.string().min(1).max(200),
  mimeType: z
    .string()
    .min(1)
    .refine(isAllowedChatMime, "Niedozwolony typ załącznika"),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  url: z
    .string()
    .regex(/^\/uploads\/chat\/[A-Za-z0-9._-]+$/, "Nieprawidłowy URL załącznika"),
});

export const chatMessageSchema = z
  .object({
    teamId: z.string().uuid("Wybierz zespół"),
    content: z
      .string()
      .max(2000, "Wiadomość może mieć maksymalnie 2000 znaków")
      .transform((value) => value.trim()),
    attachments: z.array(attachmentSchema).max(CHAT_UPLOAD_MAX_FILES).default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.content && value.attachments.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Dodaj treść albo załącznik.",
        path: ["content"],
      });
    }
  });
