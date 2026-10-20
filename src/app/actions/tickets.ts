"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin, requireAuth } from "@/lib/auth-utils";
import { sendTeamNotificationEmail, sendTicketReplyEmail, ticketUrl } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { normalizeRichTextInput } from "@/lib/rich-text";
import { notifyTicketParticipants } from "@/lib/ticket-notifications";
import { extractMentionedUserIds } from "@/lib/mentions";
import { createNotifications } from "@/lib/notifications";
import {
  findTodoColumn,
  formatTicketId,
  ticketSubjectWithRef,
} from "@/lib/tickets";
import { firstZodError } from "@/lib/validations/auth";
import { taskPath } from "@/lib/board-query";
import { notifyTaskParticipants } from "@/lib/task-notifications";

export type TicketActionState = {
  error?: string;
  success?: string;
} | null;

const statusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export async function reorderTickets(
  orderedIds: string[],
): Promise<TicketActionState> {
  const session = await requireAuth();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { error: "Brak kolejności ticketów." };
  }

  const uniqueIds = [...new Set(orderedIds.map(String).filter(Boolean))];
  if (uniqueIds.length !== orderedIds.length) {
    return { error: "Nieprawidłowa kolejność ticketów." };
  }

  const tickets = await prisma.ticket.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, teamId: true },
  });

  if (tickets.length !== uniqueIds.length) {
    return { error: "Nie znaleziono wszystkich ticketów." };
  }

  if (!session.user.isAdmin) {
    const unauthorized = tickets.some(
      (ticket) => ticket.teamId !== session.user.teamId,
    );
    if (unauthorized) {
      return { error: "Nie masz dostępu do tych ticketów." };
    }
  }

  const chunkSize = 100;
  for (let offset = 0; offset < uniqueIds.length; offset += chunkSize) {
    const chunk = uniqueIds.slice(offset, offset + chunkSize);
    await prisma.$transaction(
      chunk.map((id, indexInChunk) =>
        prisma.ticket.update({
          where: { id },
          data: { listOrder: offset + indexInChunk },
        }),
      ),
    );
  }

  revalidatePath("/tickets");
  return { success: "Zapisano kolejność ticketów." };
}

export async function updateTicketPriority(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();

  const ticketId = String(formData.get("ticketId") ?? "");
  const priority = prioritySchema.safeParse(
    String(formData.get("priority") ?? ""),
  );

  if (!ticketId || !priority.success) {
    return { error: "Nieprawidłowy priorytet ticketu." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, teamId: true },
  });
  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  if (!session.user.isAdmin && ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do tego ticketu." };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority: priority.data },
  });
  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: "Zmieniono priorytet ticketu",
    body: `Nowy priorytet: ${priority.data}.`,
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Zaktualizowano priorytet." };
}

export async function updateTicketStatus(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();

  const ticketId = String(formData.get("ticketId") ?? "");
  const status = statusSchema.safeParse(String(formData.get("status") ?? ""));

  if (!ticketId || !status.success) {
    return { error: "Nieprawidłowy status ticketu." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, teamId: true },
  });
  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  if (!session.user.isAdmin && ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do tego ticketu." };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: status.data,
      // Manual change locks status against inbound/auto transitions.
      statusLocked: true,
    },
  });
  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: "Zmieniono status ticketu",
    body: `Nowy status: ${status.data}.`,
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

export async function updateTicketAssignee(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();
  const ticketId = String(formData.get("ticketId") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
  const requestedBy = String(formData.get("requestedBy") ?? "").trim().slice(0, 255);
  const watcherIds = [...new Set(formData.getAll("watcherIds").map(String).filter(Boolean))];

  if (!ticketId) {
    return { error: "Brak ticketu." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, teamId: true },
  });
  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  if (!session.user.isAdmin && ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do tego ticketu." };
  }

  const requestedIds = [...new Set([...watcherIds, ...(assigneeId ? [assigneeId] : [])])];
  const people = requestedIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: requestedIds },
          isActive: true,
          ...(ticket.teamId ? { teamId: ticket.teamId } : {}),
        },
        select: { id: true },
      })
    : [];
  if (people.length !== requestedIds.length) {
    return { error: "Wybierz aktywne osoby z zespołu ticketu." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticketId }, data: { assigneeId, requestedBy } });
    await tx.ticketWatcher.deleteMany({ where: { ticketId } });
    if (watcherIds.length) {
      await tx.ticketWatcher.createMany({
        data: watcherIds.map((userId) => ({ ticketId, userId })),
      });
    }
  });

  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: "Zmieniono osoby przy ticketcie",
    body: "Zapisano osobę odpowiedzialną i obserwujących ticket.",
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Zapisano przypisanie ticketu." };
}

export async function addTicketInternalNote(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const explicitMentionIds = formData
    .getAll("mentionedIds")
    .map(String)
    .filter(Boolean);

  if (!ticketId || body.length < 1) {
    return { error: "Wpisz treść notatki." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      number: true,
      subject: true,
      teamId: true,
      assigneeId: true,
      watchers: { select: { userId: true } },
      team: {
        select: {
          inboundEmail: true,
          imapHost: true,
          imapUser: true,
          imapPassword: true,
        },
      },
    },
  });

  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  if (!session.user.isAdmin && ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do tego ticketu." };
  }

  const teamMembers = ticket.teamId
    ? await prisma.user.findMany({
        where: { isActive: true, teamId: ticket.teamId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];
  const mentionedIds = extractMentionedUserIds(
    body,
    teamMembers,
    explicitMentionIds,
  );

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

  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: "Dodano notatkę do ticketu",
    body: `${session.user.name ?? "Członek zespołu"} dodał(a) notatkę wewnętrzną.`,
  });

  const participantIds = new Set([
    ...(ticket.assigneeId ? [ticket.assigneeId] : []),
    ...ticket.watchers.map((watcher) => watcher.userId),
  ]);
  participantIds.delete(session.user.id);
  const mentionOnlyMembers = teamMembers.filter(
    (member) =>
      mentionedIds.includes(member.id) &&
      member.id !== session.user.id &&
      !participantIds.has(member.id),
  );
  const href = ticketUrl(ticketId);

  if (mentionOnlyMembers.length > 0) {
    await createNotifications(
      mentionOnlyMembers.map((member) => member.id),
      {
        title: "Wspomniano Cie w notatce ticketu",
        body: `${session.user.name ?? "Czlonek zespolu"}: ${body.slice(0, 120)}`,
        href,
      },
    );
  }

  const team = ticket.team;
  if (
    mentionOnlyMembers.length > 0 &&
    team?.inboundEmail &&
    team.imapHost?.startsWith("imap.") &&
    team.imapUser &&
    team.imapPassword
  ) {
    const emailResults = await Promise.allSettled(
      mentionOnlyMembers.map((member) =>
        sendTeamNotificationEmail({
          toEmail: member.email,
          inboundEmail: team.inboundEmail!,
          smtpHost: team.imapHost!.replace(/^imap\./i, "smtp."),
          smtpUser: team.imapUser!,
          smtpPassword: team.imapPassword!,
          subject: `Wspomniano Cie w tickecie ${formatTicketId(ticket.number)}`,
          body: `${session.user.name ?? "Czlonek zespolu"} wspomnial(a) Cie w notatce ticketu ${formatTicketId(ticket.number)}: ${ticket.subject}\n\n${body.slice(0, 500)}\n\nTicket w Next Kanban: ${href}`,
        }),
      ),
    );
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          "[tickets] mention email failed",
          mentionOnlyMembers[index]?.email,
          result.reason,
        );
      }
    });
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Dodano notatkę wewnętrzną." };
}

export async function editTicketInternalNote(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();
  const messageId = String(formData.get("messageId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!messageId || !body) {
    return { error: "Wpisz tresc notatki." };
  }

  const message = await prisma.ticketMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      kind: true,
      authorId: true,
      ticket: { select: { id: true, teamId: true } },
    },
  });

  if (!message || message.kind !== "INTERNAL") {
    return { error: "Nie znaleziono notatki wewnetrznej." };
  }
  if (!session.user.isAdmin && message.ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostepu do tego ticketu." };
  }
  if (!session.user.isAdmin && message.authorId !== session.user.id) {
    return { error: "Mozesz edytowac tylko swoje notatki." };
  }

  await prisma.ticketMessage.update({
    where: { id: messageId },
    data: { bodyText: body.slice(0, 10000) },
  });

  revalidatePath(`/tickets/${message.ticket.id}`);
  return { success: "Zapisano zmiany notatki." };
}

export async function replyToTicket(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!ticketId || body.length < 1) {
    return { error: "Wpisz treść odpowiedzi." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      team: {
        select: {
          inboundEmail: true,
          imapHost: true,
          imapUser: true,
          imapPassword: true,
        },
      },
    },
  });

  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  if (!session.user.isAdmin && ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do tego ticketu." };
  }
  if (
    !ticket.team?.inboundEmail ||
    !ticket.team.imapHost?.startsWith("imap.") ||
    !ticket.team.imapUser ||
    !ticket.team.imapPassword
  ) {
    return { error: "Brak skonfigurowanej skrzynki e-mail dla tego zespołu." };
  }

  const subject = ticketSubjectWithRef(ticket.number, ticket.subject);

  try {
    await sendTicketReplyEmail({
      toEmail: ticket.requesterEmail,
      requesterName: ticket.requesterName,
      agentName: session.user.name ?? "Zespół IT",
      ticketId: ticket.id,
      displayId: formatTicketId(ticket.number),
      subject,
      body,
      inboundEmail: ticket.team.inboundEmail,
      smtpHost: ticket.team.imapHost.replace(/^imap\./i, "smtp."),
      smtpUser: ticket.team.imapUser,
      smtpPassword: ticket.team.imapPassword,
    });
  } catch (error) {
    console.error("[tickets] reply email failed", error);
    return { error: "Nie udało się wysłać e-maila z odpowiedzią." };
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      kind: "OUTBOUND",
      fromEmail: ticket.team.inboundEmail,
      fromName: session.user.name ?? "Zespół IT",
      subject,
      bodyText: body.slice(0, 10000),
      authorId: session.user.id,
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      lastMessageAt: new Date(),
      ...(ticket.statusLocked
        ? {}
        : {
            status:
              ticket.status === "RESOLVED" || ticket.status === "OPEN"
                ? "IN_PROGRESS"
                : ticket.status,
          }),
    },
  });

  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: "Wysłano odpowiedź do klienta",
    body: `${session.user.name ?? "Członek zespołu"} odpowiedział(a) na ticket ${formatTicketId(ticket.number)}.`,
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { success: "Wysłano odpowiedź e-mail." };
}

const createTaskFromTicketSchema = z.object({
  ticketId: z.string().uuid(),
  boardId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  watcherIds: z.array(z.string().uuid()).max(50).default([]),
  requestedBy: z.string().trim().max(255).optional(),
});

export async function createTaskFromTicket(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();

  const teamIdRaw = String(formData.get("teamId") ?? "").trim();
  const parsed = createTaskFromTicketSchema.safeParse({
    ticketId: String(formData.get("ticketId") ?? ""),
    boardId: String(formData.get("boardId") ?? ""),
    teamId: teamIdRaw || undefined,
    assigneeId: String(formData.get("assigneeId") ?? "").trim() || undefined,
    watcherIds: [...new Set(formData.getAll("watcherIds").map(String).filter(Boolean))],
    requestedBy: String(formData.get("requestedBy") ?? "").trim(),
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
  if (!session.user.isAdmin && ticket.teamId !== session.user.teamId) {
    return { error: "Nie masz dostępu do tego ticketu." };
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

  if (!session.user.isAdmin && board.teamId !== session.user.teamId) {
    return { error: "Możesz tworzyć zadania tylko na tablicy swojego zespołu." };
  }

  if (parsed.data.teamId && board.teamId !== parsed.data.teamId) {
    return { error: "Tablica nie należy do wybranego zespołu." };
  }

  let assigneeId: string | undefined;
  if (parsed.data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: parsed.data.assigneeId },
      select: { id: true, teamId: true, isActive: true },
    });
    if (!assignee?.isActive || assignee.teamId !== board.teamId) {
      return { error: "Wybierz aktywną osobę z zespołu tablicy." };
    }
    assigneeId = assignee.id;
  }

  if (parsed.data.watcherIds.length) {
    const watcherCount = await prisma.user.count({
      where: {
        id: { in: parsed.data.watcherIds },
        isActive: true,
        teamId: board.teamId,
      },
    });
    if (watcherCount !== parsed.data.watcherIds.length) {
      return { error: "Wybierz aktywnych obserwujących z zespołu tablicy." };
    }
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
      requestedBy: parsed.data.requestedBy || ticket.requestedBy || ticket.requesterName || ticket.requesterEmail,
      ...(assigneeId
        ? { assignments: { create: [{ userId: assigneeId }] } }
        : {}),
      ...(parsed.data.watcherIds.length
        ? { watchers: { create: parsed.data.watcherIds.map((userId) => ({ userId })) } }
        : {}),
    },
    select: { id: true },
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      taskId: task.id,
      teamId: parsed.data.teamId ?? ticket.teamId ?? board.teamId,
      ...(ticket.statusLocked
        ? {}
        : {
            status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
          }),
    },
  });

  await notifyTaskParticipants({
    taskId: task.id,
    actorId: session.user.id,
    title: "Utworzono zadanie z ticketu",
    body: `Utworzono zadanie z ticketu ${displayId}: ${ticket.subject}`,
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticket.id}`);
  revalidatePath(`/boards/${board.id}`);
  redirect(taskPath(board.id, task.id));
}
