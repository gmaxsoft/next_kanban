import { z } from "zod";

export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Wiadomość nie może być pusta")
    .max(2000, "Wiadomość może mieć maksymalnie 2000 znaków"),
});
