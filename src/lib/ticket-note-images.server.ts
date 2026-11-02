import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isAllowedTicketNoteImageMime,
  TICKET_NOTE_IMAGE_EXTENSION,
  TICKET_NOTE_IMAGE_MAX_BYTES,
} from "@/lib/ticket-note-images";

export async function storeTicketNoteImage(file: File) {
  if (!isAllowedTicketNoteImageMime(file.type)) {
    throw new Error("Dozwolone są tylko obrazy JPG, PNG, GIF lub WebP.");
  }

  if (file.size <= 0 || file.size > TICKET_NOTE_IMAGE_MAX_BYTES) {
    throw new Error("Zdjęcie może mieć maksymalnie 5 MB.");
  }

  const extension = TICKET_NOTE_IMAGE_EXTENSION[file.type] ?? ".jpg";
  const fileName = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "ticket-notes");
  await mkdir(directory, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  return {
    fileName,
    url: `/uploads/ticket-notes/${fileName}`,
    mimeType: file.type,
    size: file.size,
  };
}
