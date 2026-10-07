"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-utils";
import { notifyTicketMentioned, sendTicketReplyEmail } from "@/lib/mail";
import { extractMentionedUserIds } from "@/lib/mentions";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { normalizeRichTextInput } from "@/lib/rich-text";
import {
  findTodoColumn,
  formatTicketId,
  ticketSubjectWithRef,
} from "@/lib/tickets";
import { firstZodError } from "@/lib/validations/auth";
import { taskPath } from "@/lib/board-query";

export type TicketActionState = {
  error?: string;
  success?: string;
} | null;

const statusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

export async function updateTicketStatus(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  await requireAdmin();

  const ticketId = String(formData.get("ticketId") ?? "");
  const status = statusSchema.safeParse(String(formData.get("status") ?? ""));

  if (!ticketId || !status.success) {
    return { error: "Nieprawidłowy status ticketu." };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: status.data },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Zaktualizowano status." };
}

export async function updateTicketTeam(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  await requireAdmin();

  const ticketId = String(formData.get("ticketId") ?? "");
  const teamIdRaw = String(formData.get("teamId") ?? "").trim();
  const teamId = teamIdRaw || null;

  if (!ticketId) {
    return { error: "Brak ticketu." };
  }

  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!team) {
      return { error: "Nie znaleziono zespołu." };
    }
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { teamId },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Przypisano zespół." };
}

async function notifyTicketMentions(input: {
  ticketId: string;
  teamId: string | null;
  displayId: string;
  subject: string;
  body: string;
  actorId: string;
  actorName: string;
  explicitMentionIds: string[];
  context: "reply" | "note";
}) {
  const mentionCandidates = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(input.teamId ? { teamId: input.teamId } : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const mentionedIds = extractMentionedUserIds(
    input.body,
    mentionCandidates,
    input.explicitMentionIds,
  ).filter((id) => id !== input.actorId);

  if (mentionedIds.length === 0) {
    return;
  }

  const preview = input.body.slice(0, 120);
  const href = `/tickets/${input.ticketId}`;

  await createNotifications(mentionedIds, {
    title: "Wspomniano Cię w tickecie",
    body: `${input.actorName} (${input.displayId}): ${preview}`,
    href,
  });

  for (const member of mentionCandidates) {
    if (!mentionedIds.includes(member.id)) {
      continue;
    }

    notifyTicketMentioned({
      toEmail: member.email,
      recipientName: member.name,
      actorName: input.actorName,
      displayId: input.displayId,
      subject: input.subject,
      comment: input.body,
      ticketId: input.ticketId,
      context: input.context,
    });
  }
}

export async function addTicketInternalNote(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const explicitMentionIds = formData
    .getAll("mentionedIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!ticketId || body.length < 1) {
    return { error: "Wpisz treść notatki." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, number: true, subject: true, teamId: true },
  });

  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      kind: "INTERNAL",
      bodyText: body.slice(0, 10000),
      authorId: session.user.id,
      fromName: session.user.name ?? "Administrator",
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { lastMessageAt: new Date() },
  });

  const actorName = session.user.name ?? session.user.email ?? "Administrator";
  await notifyTicketMentions({
    ticketId: ticket.id,
    teamId: ticket.teamId,
    displayId: formatTicketId(ticket.number),
    subject: ticket.subject,
    body,
    actorId: session.user.id,
    actorName,
    explicitMentionIds,
    context: "note",
  });

  revalidatePath("/", "layout");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Dodano notatkę wewnętrzną." };
}

export async function replyToTicket(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const explicitMentionIds = formData
    .getAll("mentionedIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!ticketId || body.length < 1) {
    return { error: "Wpisz treść odpowiedzi." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { team: { select: { inboundEmail: true } } },
  });

  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }

  const subject = ticketSubjectWithRef(ticket.number, ticket.subject);
  const displayId = formatTicketId(ticket.number);
  const actorName = session.user.name ?? "Support";

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      kind: "OUTBOUND",
      fromEmail: ticket.team?.inboundEmail ?? null,
      fromName: actorName,
      subject,
      bodyText: body.slice(0, 10000),
      authorId: session.user.id,
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      lastMessageAt: new Date(),
      status: ticket.status === "RESOLVED" ? "IN_PROGRESS" : ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
    },
  });

  await sendTicketReplyEmail({
    toEmail: ticket.requesterEmail,
    requesterName: ticket.requesterName,
    agentName: actorName,
    ticketId: ticket.id,
    displayId,
    subject,
    body,
    replyTo: ticket.team?.inboundEmail,
  });

  await notifyTicketMentions({
    ticketId: ticket.id,
    teamId: ticket.teamId,
    displayId,
    subject: ticket.subject,
    body,
    actorId: session.user.id,
    actorName,
    explicitMentionIds,
    context: "reply",
  });

  revalidatePath("/", "layout");
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Wysłano odpowiedź e-mail." };
}

const createTaskFromTicketSchema = z.object({
  ticketId: z.string().uuid(),
  boardId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
});

export async function createTaskFromTicket(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAdmin();

  const teamIdRaw = String(formData.get("teamId") ?? "").trim();
  const parsed = createTaskFromTicketSchema.safeParse({
    ticketId: String(formData.get("ticketId") ?? ""),
    boardId: String(formData.get("boardId") ?? ""),
    teamId: teamIdRaw || undefined,
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parsed.data.ticketId },
    include: {
      messages: {
        where: { kind: "INBOUND" },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }

  if (ticket.taskId) {
    return { error: "Ten ticket ma już powiązane zadanie." };
  }

  const board = await prisma.board.findUnique({
    where: { id: parsed.data.boardId },
    select: { id: true, title: true, teamId: true },
  });

  if (!board) {
    return { error: "Nie znaleziono tablicy." };
  }

  if (parsed.data.teamId && board.teamId !== parsed.data.teamId) {
    return { error: "Tablica nie należy do wybranego zespołu." };
  }

  const column = await findTodoColumn(board.id);
  if (!column) {
    return { error: "Tablica nie ma kolumn." };
  }

  const firstMessage = ticket.messages[0];
  const displayId = formatTicketId(ticket.number);
  const description = normalizeRichTextInput(
    [
      `<p>Utworzono z ticketu <strong>${displayId}</strong>.</p>`,
      `<p>Nadawca: ${ticket.requesterName ?? ""} &lt;${ticket.requesterEmail}&gt;</p>`,
      firstMessage?.bodyText
        ? `<p>${firstMessage.bodyText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>")}</p>`
        : "",
      `<p><a href="/tickets/${ticket.id}">Otwórz ticket</a></p>`,
    ].join(""),
  );

  const aggregate = await prisma.task.aggregate({
    where: { columnId: column.id },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title: `[${displayId}] ${ticket.subject}`.slice(0, 120),
      description,
      priority: "MEDIUM",
      order: (aggregate._max.order ?? -1) + 1,
      columnId: column.id,
      createdById: session.user.id,
    },
    select: { id: true },
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      taskId: task.id,
      teamId: parsed.data.teamId ?? ticket.teamId ?? board.teamId,
      status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
    },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticket.id}`);
  revalidatePath(`/boards/${board.id}`);
  redirect(taskPath(board.id, task.id));
}
