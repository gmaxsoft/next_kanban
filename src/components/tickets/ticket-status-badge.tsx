import type { TicketStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { ticketStatusLabel } from "@/lib/ticket-status";

const variants: Record<
  TicketStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={variants[status]}>{ticketStatusLabel(status)}</Badge>;
}

export { ticketStatusLabel } from "@/lib/ticket-status";
