import type { TicketStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { ticketStatusLabel } from "@/lib/ticket-status";

const variantByStatus: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  PENDING_VERIFICATION: "secondary",
  ON_HOLD: "outline",
  RESOLVED: "secondary",
  CLOSED: "outline",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={variantByStatus[status]}>
      {ticketStatusLabel(status)}
    </Badge>
  );
}

export { ticketStatusLabel } from "@/lib/ticket-status";
