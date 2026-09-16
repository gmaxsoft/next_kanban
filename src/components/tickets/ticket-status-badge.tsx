import type { TicketStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const labels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const variants: Record<
  TicketStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

export function ticketStatusLabel(status: TicketStatus) {
  return labels[status];
}
