import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readTaskAttachment } from "@/lib/task-attachments.server";

export const runtime = "nodejs";

const PREVIEWABLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Nie zalogowano." }, { status: 401 });
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true },
  });
  if (!account?.isActive) {
    return Response.json({ error: "Brak dostępu." }, { status: 403 });
  }

  const { attachmentId } = await params;
  const previewRequested =
    new URL(request.url).searchParams.get("preview") === "1";
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      storedName: true,
      originalName: true,
      mimeType: true,
      task: {
        select: {
          column: { select: { board: { select: { teamId: true } } } },
        },
      },
    },
  });

  if (!attachment) {
    return Response.json({ error: "Nie znaleziono załącznika." }, { status: 404 });
  }

  const previewable =
    attachment.mimeType === "application/pdf" ||
    PREVIEWABLE_IMAGE_TYPES.has(attachment.mimeType);
  if (previewRequested && !previewable) {
    return Response.json(
      { error: "Podgląd tego typu pliku nie jest obsługiwany." },
      { status: 415 },
    );
  }

  const teamId = attachment.task.column.board.teamId;
  if (!session.user.isAdmin && teamId !== session.user.teamId) {
    return Response.json({ error: "Brak dostępu." }, { status: 404 });
  }

  const content = await readTaskAttachment(attachment.storedName);
  if (!content) {
    return Response.json({ error: "Plik nie jest dostępny." }, { status: 404 });
  }

  return new Response(content, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(content.byteLength),
      "Content-Disposition": `${previewRequested ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
