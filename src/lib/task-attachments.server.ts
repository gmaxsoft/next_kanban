import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "./prisma";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export function getTaskAttachmentsDirectory() {
  const configuredDirectory = process.env.TASK_ATTACHMENTS_DIR?.trim();
  return configuredDirectory
    ? path.resolve(/*turbopackIgnore: true*/ configuredDirectory)
    : path.join(process.cwd(), "data", "task-attachments");
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

export async function storeTaskAttachment(input: {
  taskId: string;
  uploadedById: string;
  filename: string;
  contentType: string;
  content: Buffer;
}) {
  if (input.content.length === 0) {
    throw new Error("Pusty plik.");
  }
  if (input.content.length > MAX_ATTACHMENT_BYTES) {
    throw new Error("Plik jest za duży (max 20 MB).");
  }

  await mkdir(getTaskAttachmentsDirectory(), { recursive: true, mode: 0o700 });

  const contentHash = createHash("sha256").update(input.content).digest("hex");
  const existing = await prisma.taskAttachment.findUnique({
    where: { taskId_contentHash: { taskId: input.taskId, contentHash } },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }

  const id = randomUUID();
  const storedName = randomUUID();
  const filePath = path.join(
    /*turbopackIgnore: true*/ getTaskAttachmentsDirectory(),
    storedName,
  );
  await writeFile(filePath, input.content, { flag: "wx", mode: 0o600 });

  try {
    return await prisma.taskAttachment.create({
      data: {
        id,
        taskId: input.taskId,
        uploadedById: input.uploadedById,
        storedName,
        originalName: safeOriginalName(input.filename),
        mimeType: safeMimeType(input.contentType),
        size: input.content.length,
        contentHash,
      },
      select: { id: true },
    });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
}

export async function readTaskAttachment(storedName: string) {
  if (!/^[0-9a-f-]{36}$/i.test(storedName)) return null;

  try {
    return await readFile(
      path.join(
        /*turbopackIgnore: true*/ getTaskAttachmentsDirectory(),
        storedName,
      ),
    );
  } catch {
    return null;
  }
}
