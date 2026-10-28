import type { Metadata } from "next";

import {
  TicketsDataTable,
  type TicketsTableRow,
} from "@/components/tickets/tickets-data-table";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-utils";
import { ticketStatusLabel } from "@/lib/ticket-status";
import { listTickets } from "@/lib/tickets";

export const metadata: Metadata = {
  title: "Tickety",
};

export default async function TicketsPage() {
  const session = await requireAuth();
  const isAdmin = session.user.isAdmin;
  const isRestricted = session.user.isRestricted;
  const teamScope = session.user.teamId ?? "00000000-0000-0000-0000-000000000000";

  const { items: tickets } = await listTickets(
    isAdmin
      ? {}
      : isRestricted
        ? { scopedUserId: session.user.id }
        : { team: teamScope },
    { page: 1, pageSize: 10_000 },
  );

  const PRIORITY_LABELS = {
    LOW: "Niski",
    MEDIUM: "Średni",
    HIGH: "Wysoki",
  } as const;

  const rows: TicketsTableRow[] = tickets.map((ticket) => {
    const requesterDisplay =
      ticket.requestedBy || ticket.requesterName || "—";
    const assigneeName = ticket.assigneeName || "Nieprzypisany";
    const teamName = ticket.teamName || "—";
    const statusLabel = ticketStatusLabel(ticket.status);
    const priorityLabel = PRIORITY_LABELS[ticket.priority];

    return {
      id: ticket.id,
      displayId: ticket.displayId,
      subject: ticket.subject,
      status: ticket.status,
      statusLabel,
      priority: ticket.priority,
      priorityLabel,
      requesterEmail: ticket.requesterEmail,
      requesterDisplay,
      assigneeName,
      teamName,
      createdAt: ticket.createdAt,
      searchText: [
        ticket.displayId,
        ticket.subject,
        requesterDisplay,
        ticket.requesterEmail,
        assigneeName,
        teamName,
        statusLabel,
        priorityLabel,
      ]
        .join(" ")
        .toLowerCase(),
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tickety</h2>
        <p className="text-sm text-muted-foreground">
          {isRestricted
            ? "Zgłoszenia przypisane do Ciebie oraz te, w których jesteś wspomniany w notatkach."
            : "Zgłoszenia z e-maili przychodzących przypisane do Twojego zespołu."}
        </p>
      </div>

      <Card>
        <TicketsDataTable
          data={rows}
          isAdmin={isAdmin}
          description={
            rows.length === 0
              ? "Brak zgłoszeń."
              : `${rows.length} ${
                  rows.length === 1
                    ? "ticket"
                    : rows.length < 5
                      ? "tickety"
                      : "ticketów"
                } · sortowanie i filtry kolumn (TanStack Table)`
          }
        />
      </Card>
    </div>
  );
}
