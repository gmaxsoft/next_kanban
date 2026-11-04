import type { TicketStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { ticketStatusLabel } from "@/lib/ticket-status";

const variantByStatus: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
  CLOSED: "outline",
  ON_HOLD: "outline",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={variantByStatus[status]}>
      {ticketStatusLabel(status)}
    </Badge>
  );
}

export { ticketStatusLabel } from "@/lib/ticket-status";
