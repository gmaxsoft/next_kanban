import type { TicketStatus } from "@prisma/client";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Otwarte",
  IN_PROGRESS: "W trakcie",
  RESOLVED: "Rozwiązane",
};

export function ticketStatusLabel(status: TicketStatus) {
  return TICKET_STATUS_LABELS[status];
}
