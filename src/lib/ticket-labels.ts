import type { Priority, TicketStatus } from "@prisma/client";

export function ticketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case "OPEN":
      return "Otwarte";
    case "IN_PROGRESS":
      return "W realizacji";
    case "RESOLVED":
      return "Rozwiązane";
    default:
      return status;
  }
}

export function ticketPriorityLabel(priority: Priority): string {
  switch (priority) {
    case "HIGH":
      return "Wysoki";
    case "MEDIUM":
      return "Średni";
    case "LOW":
      return "Niski";
    default:
      return priority;
  }
}
