import type { TicketStatus } from "@prisma/client";

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "ON_HOLD",
] as const satisfies readonly TicketStatus[];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Otwarte",
  IN_PROGRESS: "W trakcie",
  RESOLVED: "Rozwiązane",
  CLOSED: "Zamknięte",
  ON_HOLD: "Na później",
};

export function ticketStatusLabel(status: TicketStatus) {
  return TICKET_STATUS_LABELS[status];
}
