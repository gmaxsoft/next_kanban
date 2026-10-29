"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  requireAdmin,
  requireAuth,
  requireUnrestrictedAuth,
} from "@/lib/auth-utils";
import {
  absoluteAppUrl,
  sendTeamNotificationEmail,
  sendTicketReplyEmail,
  sendTicketStatusChangedEmail,
  ticketUrl,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { normalizeRichTextInput } from "@/lib/rich-text";
import { notifyTicketParticipants } from "@/lib/ticket-notifications";
import { extractMentionedUserIds } from "@/lib/mentions";
import { createNotifications } from "@/lib/notifications";
import {
  ticketPriorityLabel,
  ticketStatusLabel,
} from "@/lib/ticket-labels";
import {
  canUserAccessTicket,
  findTodoColumn,
  formatTicketId,
  resolveTicketReplyRecipient,
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

async function denyUnlessTicketAccess(
  ticketId: string,
  user: {
    id: string;
    isAdmin: boolean;
    isRestricted: boolean;
    teamId: string | null;
  },
) {
  const allowed = await canUserAccessTicket(ticketId, user);
  if (!allowed) {
    return { error: "Nie masz dostępu do tego ticketu." } as const;
  }
  return null;
}

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
    if (session.user.isRestricted) {
      for (const ticket of tickets) {
        const allowed = await canUserAccessTicket(ticket.id, session.user);
        if (!allowed) {
          return { error: "Nie masz dostępu do tych ticketów." };
        }
      }
    } else {
      const unauthorized = tickets.some(
        (ticket) => ticket.teamId !== session.user.teamId,
      );
      if (unauthorized) {
        return { error: "Nie masz dostępu do tych ticketów." };
      }
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
    select: { id: true, teamId: true, number: true, subject: true },
  });
  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  const denied = await denyUnlessTicketAccess(ticketId, session.user);
  if (denied) {
    return denied;
  }

  const priorityLabel = ticketPriorityLabel(priority.data);
  const displayId = formatTicketId(ticket.number);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority: priority.data },
  });
  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: `Priorytet ${displayId}: ${priorityLabel}`,
    body: `Zgłoszenie ${displayId} („${ticket.subject}”) ma teraz priorytet: ${priorityLabel}.`,
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
  const deniedStatus = await denyUnlessTicketAccess(ticketId, session.user);
  if (deniedStatus) {
    return deniedStatus;
  }

  const statusLabel = ticketStatusLabel(status.data);
  const displayId = formatTicketId(ticket.number);

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
    title: `Status ${displayId}: ${statusLabel}`,
    body: `Zgłoszenie ${displayId} („${ticket.subject}”) zmieniło status na: ${statusLabel}.`,
  });

  const team = ticket.team;
  if (
    team?.inboundEmail &&
    team.imapHost?.startsWith("imap.") &&
    team.imapUser &&
    team.imapPassword
  ) {
    try {
      const recipient = await resolveTicketReplyRecipient(ticket);
      await sendTicketStatusChangedEmail({
        toEmail: recipient.toEmail,
        requesterName: recipient.requesterName,
        displayId,
        subject: ticket.subject,
        statusLabel,
        ticketId: ticket.id,
        inboundEmail: team.inboundEmail,
        smtpHost: team.imapHost.replace(/^imap\./i, "smtp."),
        smtpUser: team.imapUser,
        smtpPassword: team.imapPassword,
      });
    } catch (error) {
      console.error("[tickets] status email to requester failed", error);
    }
  }

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
  if (session.user.isRestricted) {
    return { error: "Brak uprawnień do zmiany przypisania." };
  }
  const ticketId = String(formData.get("ticketId") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
  const requesterUserId =
    String(formData.get("requesterUserId") ?? "").trim() || null;
  const requestedByRaw = String(formData.get("requestedBy") ?? "")
    .trim()
    .slice(0, 255);
  const requesterEmailRaw = String(formData.get("requesterEmail") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 255);
  const watcherIds = [...new Set(formData.getAll("watcherIds").map(String).filter(Boolean))];

  if (!ticketId) {
    return { error: "Brak ticketu." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      teamId: true,
      requesterEmail: true,
      requesterName: true,
      requestedBy: true,
    },
  });
  if (!ticket) {
    return { error: "Nie znaleziono ticketu." };
  }
  const deniedAssignee = await denyUnlessTicketAccess(ticketId, session.user);
  if (deniedAssignee) {
    return deniedAssignee;
  }

  const requestedIds = [
    ...new Set([
      ...watcherIds,
      ...(assigneeId ? [assigneeId] : []),
      ...(requesterUserId ? [requesterUserId] : []),
    ]),
  ];
  const people = requestedIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: requestedIds },
          isActive: true,
          ...(ticket.teamId ? { teamId: ticket.teamId } : {}),
        },
        select: { id: true, name: true, email: true },
      })
    : [];
  if (people.length !== requestedIds.length) {
    return { error: "Wybierz aktywne osoby z zespołu ticketu." };
  }

  const requesterUser = requesterUserId
    ? people.find((person) => person.id === requesterUserId)
    : null;

  let requestedBy = requestedByRaw;
  let requesterEmail = ticket.requesterEmail;
  let requesterName = ticket.requesterName;

  if (requesterUser) {
    requestedBy = requesterUser.name;
    requesterEmail = requesterUser.email;
    requesterName = requesterUser.name;
  } else {
    if (!requestedBy) {
      return { error: "Podaj zgłaszającego." };
    }

    if (requesterEmailRaw) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmailRaw)) {
        return { error: "Podaj poprawny e-mail zgłaszającego." };
      }
      requesterEmail = requesterEmailRaw;
      requesterName = requestedBy;
    } else {
      const resolved = await resolveTicketReplyRecipient({
        requesterEmail: ticket.requesterEmail,
        requesterName: ticket.requesterName,
        requestedBy,
        teamId: ticket.teamId,
      });
      requesterEmail = resolved.toEmail;
      requesterName = resolved.requesterName;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId,
        requestedBy: requestedBy || null,
        requesterEmail,
        requesterName,
      },
    });
    await tx.ticketWatcher.deleteMany({ where: { ticketId } });
    if (watcherIds.length) {
      await tx.ticketWatcher.createMany({
        data: watcherIds.map((userId) => ({ ticketId, userId })),
      });
    }
  });

  const assigneeName = assigneeId
    ? people.find((person) => person.id === assigneeId)?.name
    : null;

  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: "Zaktualizowano osoby w zgłoszeniu",
    body: [
      `Zgłaszający: ${requestedBy}.`,
      assigneeName
        ? `Odpowiedzialny: ${assigneeName}.`
        : "Odpowiedzialny: nieprzypisany.",
      watcherIds.length
        ? `Obserwujący: ${watcherIds.length}.`
        : "Brak obserwujących.",
    ].join(" "),
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
  const deniedNote = await denyUnlessTicketAccess(ticketId, session.user);
  if (deniedNote) {
    return deniedNote;
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
      mentions:
        mentionedIds.length > 0
          ? {
              create: mentionedIds.map((userId) => ({ userId })),
            }
          : undefined,
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { lastMessageAt: new Date() },
  });

  const displayId = formatTicketId(ticket.number);

  await notifyTicketParticipants({
    ticketId,
    actorId: session.user.id,
    title: `Nowa notatka · ${displayId}`,
    body: `${session.user.name ?? "Członek zespołu"} dodał(a) notatkę wewnętrzną w zgłoszeniu ${displayId} („${ticket.subject}”).`,
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
        title: `Wspomniano Cię · ${displayId}`,
        body: `${session.user.name ?? "Członek zespołu"}: ${body.slice(0, 120)}`,
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
          recipientName: member.name,
          inboundEmail: team.inboundEmail!,
          smtpHost: team.imapHost!.replace(/^imap\./i, "smtp."),
          smtpUser: team.imapUser!,
          smtpPassword: team.imapPassword!,
          subject: `Wspomniano Cię w zgłoszeniu ${formatTicketId(ticket.number)}`,
          body: `${session.user.name ?? "Członek zespołu"} wspomniał(a) Cię w notatce zgłoszenia ${formatTicketId(ticket.number)} („${ticket.subject}”):\n\n${body.slice(0, 500)}`,
          actionUrl: absoluteAppUrl(href),
          actionLabel: "Otwórz zgłoszenie",
          ticketDisplayId: formatTicketId(ticket.number),
          ticketSubject: ticket.subject,
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
  const explicitMentionIds = formData
    .getAll("mentionedIds")
    .map(String)
    .filter(Boolean);

  if (!messageId || !body) {
    return { error: "Wpisz tresc notatki." };
  }

  const message = await prisma.ticketMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      kind: true,
      authorId: true,
      mentions: { select: { userId: true } },
      ticket: {
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
      },
    },
  });

  if (!message || message.kind !== "INTERNAL") {
    return { error: "Nie znaleziono notatki wewnetrznej." };
  }
  const deniedEdit = await denyUnlessTicketAccess(
    message.ticket.id,
    session.user,
  );
  if (deniedEdit) {
    return deniedEdit;
  }
  if (!session.user.isAdmin && message.authorId !== session.user.id) {
    return { error: "Mozesz edytowac tylko swoje notatki." };
  }

  const teamMembers = message.ticket.teamId
    ? await prisma.user.findMany({
        where: { isActive: true, teamId: message.ticket.teamId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];
  const mentionedIds = extractMentionedUserIds(
    body,
    teamMembers,
    explicitMentionIds,
  );
  const previousMentionIds = new Set(
    message.mentions.map((mention) => mention.userId),
  );
  const newlyMentionedIds = mentionedIds.filter(
    (userId) => !previousMentionIds.has(userId),
  );

  await prisma.$transaction([
    prisma.ticketMessageMention.deleteMany({ where: { messageId } }),
    prisma.ticketMessage.update({
      where: { id: messageId },
      data: {
        bodyText: body.slice(0, 10000),
        mentions:
          mentionedIds.length > 0
            ? { create: mentionedIds.map((userId) => ({ userId })) }
            : undefined,
      },
    }),
  ]);

  const ticket = message.ticket;
  const displayId = formatTicketId(ticket.number);
  const newlyMentionedMembers = teamMembers.filter(
    (member) =>
      newlyMentionedIds.includes(member.id) && member.id !== session.user.id,
  );
  const href = ticketUrl(ticket.id);

  if (newlyMentionedMembers.length > 0) {
    await createNotifications(
      newlyMentionedMembers.map((member) => member.id),
      {
        title: `Wspomniano Cię · ${displayId}`,
        body: `${session.user.name ?? "Członek zespołu"}: ${body.slice(0, 120)}`,
        href,
      },
    );
  }

  const team = ticket.team;
  if (
    newlyMentionedMembers.length > 0 &&
    team?.inboundEmail &&
    team.imapHost?.startsWith("imap.") &&
    team.imapUser &&
    team.imapPassword
  ) {
    const emailResults = await Promise.allSettled(
      newlyMentionedMembers.map((member) =>
        sendTeamNotificationEmail({
          toEmail: member.email,
          recipientName: member.name,
          inboundEmail: team.inboundEmail!,
          smtpHost: team.imapHost!.replace(/^imap\./i, "smtp."),
          smtpUser: team.imapUser!,
          smtpPassword: team.imapPassword!,
          subject: `Wspomniano Cię w zgłoszeniu ${displayId}`,
          body: `${session.user.name ?? "Członek zespołu"} wspomniał(a) Cię w notatce zgłoszenia ${displayId} („${ticket.subject}”):\n\n${body.slice(0, 500)}`,
          actionUrl: absoluteAppUrl(href),
          actionLabel: "Otwórz zgłoszenie",
          ticketDisplayId: displayId,
          ticketSubject: ticket.subject,
        }),
      ),
    );
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          "[tickets] mention email failed",
          newlyMentionedMembers[index]?.email,
          result.reason,
        );
      }
    });
  }

  revalidatePath(`/tickets/${ticket.id}`);
  return { success: "Zapisano zmiany notatki." };
}

export async function deleteTicketInternalNote(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireAuth();
  const messageId = String(formData.get("messageId") ?? "").trim();

  if (!messageId) {
    return { error: "Brak notatki." };
  }

  const message = await prisma.ticketMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      kind: true,
      authorId: true,
      ticket: { select: { id: true } },
    },
  });

  if (!message || message.kind !== "INTERNAL") {
    return { error: "Nie znaleziono notatki wewnętrznej." };
  }

  const denied = await denyUnlessTicketAccess(message.ticket.id, session.user);
  if (denied) {
    return denied;
  }

  if (!session.user.isAdmin && message.authorId !== session.user.id) {
    return { error: "Możesz usuwać tylko swoje notatki." };
  }

  await prisma.ticketMessage.delete({ where: { id: messageId } });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${message.ticket.id}`);
  return { success: "Usunięto notatkę wewnętrzną." };
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
  const deniedReply = await denyUnlessTicketAccess(ticketId, session.user);
  if (deniedReply) {
    return deniedReply;
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
  const recipient = await resolveTicketReplyRecipient(ticket);
  const displayId = formatTicketId(ticket.number);

  try {
    await sendTicketReplyEmail({
      toEmail: recipient.toEmail,
      requesterName: recipient.requesterName,
      agentName: session.user.name ?? "HelpDesk",
      ticketId: ticket.id,
      displayId,
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
      fromName: session.user.name ?? "HelpDesk",
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
    title: `Wysłano odpowiedź · ${displayId}`,
    body: `${session.user.name ?? "Członek zespołu"} wysłał(a) odpowiedź e-mail do zgłaszającego w zgłoszeniu ${displayId} („${ticket.subject}”).`,
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
  if (session.user.isRestricted) {
    return { error: "Brak uprawnień do tworzenia zadania z ticketu." };
  }
  const deniedTask = await denyUnlessTicketAccess(
    parsed.data.ticketId,
    session.user,
  );
  if (deniedTask) {
    return deniedTask;
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

export type MergeTicketsResult = {
  error?: string;
  success?: string;
  primaryTicketId?: string;
};

export async function mergeTickets(input: {
  primaryTicketId: string;
  sourceTicketIds: string[];
}): Promise<MergeTicketsResult> {
  const session = await requireUnrestrictedAuth();

  const primaryTicketId = String(input.primaryTicketId ?? "").trim();
  const sourceTicketIds = [
    ...new Set(
      (input.sourceTicketIds ?? [])
        .map((id) => String(id).trim())
        .filter(Boolean),
    ),
  ].filter((id) => id !== primaryTicketId);

  if (!primaryTicketId || sourceTicketIds.length === 0) {
    return { error: "Wybierz co najmniej dwa tickety i ticket główny." };
  }

  const allIds = [primaryTicketId, ...sourceTicketIds];
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      number: true,
      teamId: true,
      taskId: true,
      mergedIntoId: true,
      watchers: { select: { userId: true } },
    },
  });

  if (tickets.length !== allIds.length) {
    return { error: "Nie znaleziono wszystkich wybranych ticketów." };
  }

  const alreadyMerged = tickets.filter((ticket) => ticket.mergedIntoId);
  if (alreadyMerged.length > 0) {
    return {
      error: "Jeden z wybranych ticketów jest już scalony z innym zgłoszeniem.",
    };
  }

  if (!session.user.isAdmin) {
    const unauthorized = tickets.some(
      (ticket) => ticket.teamId !== session.user.teamId,
    );
    if (unauthorized) {
      return { error: "Nie masz dostępu do wszystkich wybranych ticketów." };
    }
  }

  const primary = tickets.find((ticket) => ticket.id === primaryTicketId)!;
  const sources = tickets.filter((ticket) => ticket.id !== primaryTicketId);
  const sourceLabels = sources
    .map((ticket) => formatTicketId(ticket.number))
    .sort();

  const primaryWatcherIds = new Set(
    primary.watchers.map((watcher) => watcher.userId),
  );
  const watchersToAdd = [
    ...new Set(
      sources.flatMap((ticket) =>
        ticket.watchers.map((watcher) => watcher.userId),
      ),
    ),
  ].filter((userId) => !primaryWatcherIds.has(userId));

  let taskIdToMove: string | null = null;
  if (!primary.taskId) {
    const sourceWithTask = sources.find((ticket) => ticket.taskId);
    if (sourceWithTask?.taskId) {
      taskIdToMove = sourceWithTask.taskId;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketMessage.updateMany({
      where: { ticketId: { in: sourceTicketIds } },
      data: { ticketId: primaryTicketId },
    });

    if (watchersToAdd.length > 0) {
      await tx.ticketWatcher.createMany({
        data: watchersToAdd.map((userId) => ({
          ticketId: primaryTicketId,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    for (const source of sources) {
      await tx.ticket.update({
        where: { id: source.id },
        data: {
          mergedIntoId: primaryTicketId,
          status: "RESOLVED",
          taskId: null,
        },
      });
    }

    await tx.ticket.update({
      where: { id: primaryTicketId },
      data: {
        lastMessageAt: new Date(),
        ...(taskIdToMove ? { taskId: taskIdToMove } : {}),
      },
    });

    await tx.ticketMessage.create({
      data: {
        ticketId: primaryTicketId,
        kind: "INTERNAL",
        bodyText: `Scalono tickety ${sourceLabels.join(", ")} do tego zgłoszenia (${formatTicketId(primary.number)}).`,
        authorId: session.user.id,
        fromName: session.user.name ?? "System",
      },
    });
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${primaryTicketId}`);
  for (const sourceId of sourceTicketIds) {
    revalidatePath(`/tickets/${sourceId}`);
  }

  return {
    success: `Scalono ${sourceLabels.join(", ")} do ${formatTicketId(primary.number)}.`,
    primaryTicketId,
  };
}
