import type { Priority } from "@prisma/client";

export { ticketStatusLabel } from "@/lib/ticket-status";

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
