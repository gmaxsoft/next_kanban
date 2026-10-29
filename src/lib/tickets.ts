import type { Priority, Prisma, TicketStatus } from "@prisma/client";

import { buildPaginationMeta, type PaginationMeta, type PaginationState } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const TICKET_REF_PATTERN = /\[T-(\d+)\]/i;

export type TicketsListFilters = {
  q: string;
  status: "" | TicketStatus;
  team: string;
  /** Restricted role: only assignee or internal-note mentions. */
  scopedUserId?: string;
};

/** Tickets visible to a restricted user. */
export function restrictedTicketsWhere(
  userId: string,
): Prisma.TicketWhereInput {
  return {
    OR: [
      { assigneeId: userId },
      {
        messages: {
          some: {
            kind: "INTERNAL",
            mentions: { some: { userId } },
          },
        },
      },
    ],
  };
}

export async function canUserAccessTicket(
  ticketId: string,
  user: { id: string; isAdmin: boolean; isRestricted: boolean; teamId: string | null },
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      teamId: true,
      assigneeId: true,
      messages: {
        where: {
          kind: "INTERNAL",
          mentions: { some: { userId: user.id } },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!ticket) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  if (user.isRestricted) {
    return (
      ticket.assigneeId === user.id || ticket.messages.length > 0
    );
  }

  return !ticket.teamId || ticket.teamId === user.teamId;
}

export type TicketListItem = {
  id: string;
  number: number;
  displayId: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  requesterEmail: string;
  requesterName: string | null;
  requestedBy: string;
  teamId: string | null;
  teamName: string | null;
  taskId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  lastMessageAt: string;
};

export function formatTicketId(number: number) {
  return `T-${number}`;
}

export function parseTicketRef(subject: string) {
  const match = subject.match(TICKET_REF_PATTERN);
  if (!match) {
    return null;
  }

  const number = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function stripTicketRef(subject: string) {
  return subject
    .replace(/^(re|fw|fwd)\s*:\s*/gi, "")
    .replace(TICKET_REF_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ticketSubjectWithRef(number: number, subject: string) {
  const clean = stripTicketRef(subject) || "Ticket";
  return `Re: [${formatTicketId(number)}] ${clean}`;
}

export function parseEmailAddress(raw: string): { email: string; name: string | null } {
  const trimmed = raw.trim();
  const angled = trimmed.match(/^(.*)<([^>]+)>$/);

  if (angled) {
    const name = angled[1]?.trim().replace(/^"|"$/g, "") || null;
    return { email: angled[2]!.trim().toLowerCase(), name };
  }

  return { email: trimmed.toLowerCase(), name: null };
}

const EMAIL_IN_TEXT =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function extractEmailFromText(value: string): string | null {
  const match = value.match(EMAIL_IN_TEXT);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Reply destination for ticket correspondence.
 * Prefer the person set as Zgłaszający (requestedBy), not the original inbound sender.
 */
export async function resolveTicketReplyRecipient(ticket: {
  requesterEmail: string;
  requesterName: string | null;
  requestedBy: string | null;
  teamId: string | null;
}): Promise<{ toEmail: string; requesterName: string | null }> {
  const requestedBy = ticket.requestedBy?.trim() ?? "";

  const emailFromField = extractEmailFromText(requestedBy);
  if (emailFromField) {
    const name = requestedBy
      .replace(EMAIL_IN_TEXT, "")
      .replace(/[<>]/g, "")
      .trim();
    return {
      toEmail: emailFromField,
      requesterName: name || ticket.requesterName,
    };
  }

  if (requestedBy) {
    const byName = await prisma.user.findFirst({
      where: {
        isActive: true,
        name: requestedBy,
        ...(ticket.teamId ? { teamId: ticket.teamId } : {}),
      },
      select: { email: true, name: true },
    });

    if (byName) {
      return { toEmail: byName.email, requesterName: byName.name };
    }

    const byNameAnyTeam = ticket.teamId
      ? await prisma.user.findFirst({
          where: { isActive: true, name: requestedBy },
          select: { email: true, name: true },
        })
      : null;

    if (byNameAnyTeam) {
      return {
        toEmail: byNameAnyTeam.email,
        requesterName: byNameAnyTeam.name,
      };
    }
  }

  return {
    toEmail: ticket.requesterEmail,
    requesterName:
      requestedBy || ticket.requesterName || ticket.requesterEmail,
  };
}

export async function findTeamByInboundAddress(addresses: string[]) {
  const normalized = addresses
    .map((value) => parseEmailAddress(value).email)
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  const teams = await prisma.team.findMany({
    where: {
      inboundEmail: { in: normalized },
    },
    select: { id: true, name: true, inboundEmail: true },
  });

  if (teams.length > 0) {
    return teams[0]!;
  }

  // Fallback: match local-part (it@…) to team inbound local-part
  const locals = normalized.map((email) => email.split("@")[0]!).filter(Boolean);
  const allWithInbox = await prisma.team.findMany({
    where: { inboundEmail: { not: null } },
    select: { id: true, name: true, inboundEmail: true },
  });

  return (
    allWithInbox.find((team) => {
      const local = team.inboundEmail?.split("@")[0]?.toLowerCase();
      return local && locals.includes(local);
    }) ?? null
  );
}

export async function listTickets(
  filters: Partial<TicketsListFilters> = {},
  pagination: PaginationState = { page: 1, pageSize: 15 },
): Promise<{ items: TicketListItem[]; meta: PaginationMeta }> {
  const query = filters.q?.trim();
  const and: Prisma.TicketWhereInput[] = [];

  // Merged source tickets stay in DB for email routing but leave the list.
  and.push({ mergedIntoId: null });

  if (filters.status) {
    and.push({ status: filters.status });
  }
  if (filters.team) {
    and.push({ teamId: filters.team });
  }
  if (filters.scopedUserId) {
    and.push(restrictedTicketsWhere(filters.scopedUserId));
  }
  if (query) {
    and.push({
      OR: [
        { subject: { contains: query } },
        { requesterEmail: { contains: query } },
        { requesterName: { contains: query } },
        ...(Number.isFinite(Number(query.replace(/^t-/i, "")))
          ? [{ number: Number(query.replace(/^t-/i, "")) }]
          : []),
      ],
    });
  }

  const where: Prisma.TicketWhereInput =
    and.length === 0 ? {} : and.length === 1 ? and[0]! : { AND: and };

  const total = await prisma.ticket.count({ where });
  const meta = buildPaginationMeta(total, pagination);

  const tickets = await prisma.ticket.findMany({
    where,
    skip: meta.skip,
    take: meta.take,
    orderBy: [
      { listOrder: "asc" },
      { lastMessageAt: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      team: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  return {
    meta,
    items: tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.number,
      displayId: formatTicketId(ticket.number),
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      requesterEmail: ticket.requesterEmail,
      requesterName: ticket.requesterName,
      requestedBy: ticket.requestedBy ?? ticket.requesterName ?? ticket.requesterEmail,
      teamId: ticket.teamId,
      teamName: ticket.team?.name ?? null,
      taskId: ticket.taskId,
      assigneeId: ticket.assigneeId,
      assigneeName: ticket.assignee?.name ?? null,
      createdAt: ticket.createdAt.toISOString(),
      lastMessageAt: ticket.lastMessageAt.toISOString(),
    })),
  };
}

export async function getTicketDetails(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      team: { select: { id: true, name: true, inboundEmail: true } },
      assignee: { select: { id: true, name: true } },
      watchers: { select: { userId: true } },
      mergedInto: { select: { id: true, number: true } },
      mergedSources: {
        select: { id: true, number: true },
        orderBy: { number: "asc" },
      },
      task: {
        select: {
          id: true,
          title: true,
          column: { select: { boardId: true, title: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          attachments: {
            orderBy: { createdAt: "asc" },
            select: { id: true, originalName: true, mimeType: true, size: true },
          },
        },
      },
    },
  });
}

/** Follow mergedInto chain to the live primary ticket id. */
export async function resolveMergedTicketId(ticketId: string) {
  let currentId = ticketId;
  for (let depth = 0; depth < 10; depth += 1) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: currentId },
      select: { id: true, mergedIntoId: true },
    });
    if (!ticket) {
      return null;
    }
    if (!ticket.mergedIntoId) {
      return ticket.id;
    }
    currentId = ticket.mergedIntoId;
  }
  return currentId;
}

const TODO_COLUMN_PATTERN = /^(do zrobienia|to\s*do|todo|backlog)$/i;

export async function findTodoColumn(boardId: string) {
  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  });

  return (
    columns.find((column) => TODO_COLUMN_PATTERN.test(column.title.trim())) ??
    columns[0] ??
    null
  );
}
