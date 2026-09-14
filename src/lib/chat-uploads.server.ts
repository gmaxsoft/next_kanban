import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHAT_EXTENSION_BY_MIME,
  CHAT_UPLOAD_MAX_BYTES,
  isAllowedChatMime,
  sanitizeOriginalName,
  type StoredChatFile,
} from "@/lib/chat-uploads";

export async function storeChatUpload(file: File): Promise<StoredChatFile> {
  if (!isAllowedChatMime(file.type)) {
    throw new Error(`Niedozwolony typ pliku: ${file.type || "unknown"}`);
  }

  if (file.size <= 0 || file.size > CHAT_UPLOAD_MAX_BYTES) {
    throw new Error("Plik musi mieć od 1 B do 10 MB.");
  }

  const extension =
    CHAT_EXTENSION_BY_MIME[file.type] ??
    path.extname(file.name).toLowerCase().slice(0, 8);
  const fileName = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "chat");
  await mkdir(directory, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  return {
    fileName,
    originalName: sanitizeOriginalName(file.name) || fileName,
    mimeType: file.type,
    size: file.size,
    url: `/uploads/chat/${fileName}`,
  };
}
