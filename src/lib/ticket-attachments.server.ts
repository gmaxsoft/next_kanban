import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "./prisma";
import {
  isEmailSignatureNoiseAttachment,
  TICKET_UPLOAD_MAX_BYTES,
  TICKET_UPLOAD_MAX_FILES,
  TICKET_UPLOAD_MAX_MESSAGE_BYTES,
} from "./ticket-attachments";

export type IncomingTicketAttachment = {
  filename?: string | null;
  contentType?: string | null;
  content: Uint8Array;
};

export function getTicketAttachmentsDirectory() {
  const configuredDirectory = process.env.TICKET_ATTACHMENTS_DIR?.trim();
  return configuredDirectory
    ? path.resolve(/*turbopackIgnore: true*/ configuredDirectory)
    : path.join(process.cwd(), "data", "ticket-attachments");
}

function safeOriginalName(filename: string | null | undefined) {
  const baseName = path.basename((filename || "zalacznik").replace(/\\/g, "/"));
  const cleaned = baseName.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "zalacznik").slice(0, 255);
}

function safeMimeType(contentType: string | null | undefined) {
  const mimeType = contentType?.split(";")[0]?.trim().toLowerCase() || "";
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(
    mimeType,
  )
    ? mimeType.slice(0, 255)
    : "application/octet-stream";
}

export async function collectTicketUploadFiles(
  formData: FormData,
  fieldName = "files",
): Promise<
  | { ok: true; attachments: IncomingTicketAttachment[] }
  | { ok: false; error: string }
> {
  const entries = formData.getAll(fieldName);
  const attachments: IncomingTicketAttachment[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    if (!(entry instanceof File) || entry.size <= 0) {
      continue;
    }

    if (attachments.length >= TICKET_UPLOAD_MAX_FILES) {
      return {
        ok: false,
        error: `Maksymalnie ${TICKET_UPLOAD_MAX_FILES} załączników naraz.`,
      };
    }

    if (entry.size > TICKET_UPLOAD_MAX_BYTES) {
      return {
        ok: false,
        error: `Plik „${entry.name}” przekracza limit 20 MB.`,
      };
    }

    if (totalBytes + entry.size > TICKET_UPLOAD_MAX_MESSAGE_BYTES) {
      return {
        ok: false,
        error: "Łączny rozmiar załączników przekracza 40 MB.",
      };
    }

    const content = new Uint8Array(await entry.arrayBuffer());
    attachments.push({
      filename: entry.name,
      contentType: entry.type || null,
      content,
    });
    totalBytes += entry.size;
  }

  return { ok: true, attachments };
}

export async function storeTicketAttachments(
  messageId: string,
  attachments: IncomingTicketAttachment[] = [],
) {
  if (attachments.length === 0) return;

  await mkdir(getTicketAttachmentsDirectory(), { recursive: true, mode: 0o700 });

  let storedCount = 0;
  let storedBytes = 0;

  for (const attachment of attachments) {
    const content = Buffer.from(attachment.content);
    if (content.length === 0) continue;

    if (
      isEmailSignatureNoiseAttachment({
        filename: attachment.filename,
        contentType: attachment.contentType,
      })
    ) {
      continue;
    }

    if (
      storedCount >= TICKET_UPLOAD_MAX_FILES ||
      content.length > TICKET_UPLOAD_MAX_BYTES ||
      storedBytes + content.length > TICKET_UPLOAD_MAX_MESSAGE_BYTES
    ) {
      console.warn(
        `[ticket-attachments] skipped oversized/excess attachment for message=${messageId}`,
      );
      continue;
    }

    const contentHash = createHash("sha256").update(content).digest("hex");
    const existing = await prisma.ticketAttachment.findUnique({
      where: { messageId_contentHash: { messageId, contentHash } },
      select: { id: true },
    });
    if (existing) continue;

    const id = randomUUID();
    const storedName = randomUUID();
    const filePath = path.join(
      /*turbopackIgnore: true*/ getTicketAttachmentsDirectory(),
      storedName,
    );
    await writeFile(filePath, content, { flag: "wx", mode: 0o600 });

    try {
      await prisma.ticketAttachment.create({
        data: {
          id,
          messageId,
          storedName,
          originalName: safeOriginalName(attachment.filename),
          mimeType: safeMimeType(attachment.contentType),
          size: content.length,
          contentHash,
        },
      });
      storedCount += 1;
      storedBytes += content.length;
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      // A repeated IMAP delivery can race with an already completed import.
      const raced = await prisma.ticketAttachment.findUnique({
        where: { messageId_contentHash: { messageId, contentHash } },
        select: { id: true },
      });
      if (!raced) throw error;
    }
  }
}

export async function readTicketAttachment(storedName: string) {
  if (!/^[0-9a-f-]{36}$/i.test(storedName)) return null;

  try {
    return await readFile(
      path.join(
        /*turbopackIgnore: true*/ getTicketAttachmentsDirectory(),
        storedName,
      ),
    );
  } catch {
    return null;
  }
}
