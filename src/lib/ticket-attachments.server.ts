import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "./prisma";

const MAX_ATTACHMENT_FILES = 20;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_MESSAGE_ATTACHMENT_BYTES = 40 * 1024 * 1024;

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
      storedCount >= MAX_ATTACHMENT_FILES ||
      content.length > MAX_ATTACHMENT_BYTES ||
      storedBytes + content.length > MAX_MESSAGE_ATTACHMENT_BYTES
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
