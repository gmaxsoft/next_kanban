import type { Prisma, TicketStatus } from "@prisma/client";

import { buildPaginationMeta, type PaginationMeta, type PaginationState } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const TICKET_REF_PATTERN = /\[T-(\d+)\]/i;

export type TicketsListFilters = {
  q: string;
  status: "" | TicketStatus;
  team: string;
};

export type TicketListItem = {
  id: string;
  number: number;
  displayId: string;
  subject: string;
  status: TicketStatus;
  requesterEmail: string;
  requesterName: string | null;
  teamId: string | null;
  teamName: string | null;
  taskId: string | null;
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
  const where: Prisma.TicketWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.team ? { teamId: filters.team } : {}),
    ...(query
      ? {
          OR: [
            { subject: { contains: query } },
            { requesterEmail: { contains: query } },
            { requesterName: { contains: query } },
            ...(Number.isFinite(Number(query.replace(/^t-/i, "")))
              ? [{ number: Number(query.replace(/^t-/i, "")) }]
              : []),
          ],
        }
      : {}),
  };

  const total = await prisma.ticket.count({ where });
  const meta = buildPaginationMeta(total, pagination);

  const tickets = await prisma.ticket.findMany({
    where,
    skip: meta.skip,
    take: meta.take,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: {
      team: { select: { id: true, name: true } },
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
      requesterEmail: ticket.requesterEmail,
      requesterName: ticket.requesterName,
      teamId: ticket.teamId,
      teamName: ticket.team?.name ?? null,
      taskId: ticket.taskId,
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
        },
      },
    },
  });
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
