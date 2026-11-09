import type { TicketStatus } from "@prisma/client";

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_VERIFICATION",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
] as const satisfies readonly TicketStatus[];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Otwarte",
  IN_PROGRESS: "W trakcie",
  PENDING_VERIFICATION: "Do weryfikacji",
  ON_HOLD: "Na później",
  RESOLVED: "Rozwiązane",
  CLOSED: "Zamknięte",
};

export function ticketStatusLabel(status: TicketStatus) {
  return TICKET_STATUS_LABELS[status];
}
