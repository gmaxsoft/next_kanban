import type { Metadata } from "next";
import Link from "next/link";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListFilters } from "@/components/ui/list-filters";
import { ListPagination } from "@/components/ui/list-pagination";
import { requireAdmin } from "@/lib/auth-utils";
import { listTeams } from "@/lib/boards";
import { parsePagination, parseTicketsListSearch } from "@/lib/list-query";
import { listTickets } from "@/lib/tickets";

export const metadata: Metadata = {
  title: "Tickety",
};

type TicketsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    team?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function formatArrival(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const filters = parseTicketsListSearch(params);
  const pagination = parsePagination(params);
  const [teams, { items: tickets, meta }] = await Promise.all([
    listTeams(),
    listTickets(filters, pagination),
  ]);

  const listQuery = {
    q: filters.q || undefined,
    status: filters.status || undefined,
    team: filters.team || undefined,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tickety</h2>
        <p className="text-sm text-muted-foreground">
          Zgłoszenia z e-maili przychodzących (Resend Inbound / webhook). Tylko
          ADMINISTRATOR.
        </p>
      </div>

      <ListFilters
        key={`${filters.q}|${filters.status}|${filters.team}|${meta.pageSize}`}
        pathname="/tickets"
        preserve={{ pageSize: meta.pageSize }}
        fields={[
          {
            type: "search",
            name: "q",
            label: "Szukaj",
            value: filters.q,
            placeholder: "temat, nadawca, T-101...",
          },
          {
            type: "select",
            name: "status",
            label: "Status",
            value: filters.status,
            emptyLabel: "Wszystkie statusy",
            options: [
              { value: "OPEN", label: "Open" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "RESOLVED", label: "Resolved" },
            ],
          },
          {
            type: "select",
            name: "team",
            label: "Zespół",
            value: filters.team,
            emptyLabel: "Wszystkie zespoły",
            options: teams.map((team) => ({
              value: team.id,
              label: team.name,
            })),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista ticketów</CardTitle>
          <CardDescription>
            {meta.total === 0
              ? "Brak zgłoszeń."
              : `Pokazano ${tickets.length} z ${meta.total} ticketów.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Temat</th>
                <th className="px-3 py-2 font-medium">Nadawca</th>
                <th className="px-3 py-2 font-medium">Zespół</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Data przybycia</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Brak ticketów pasujących do filtrów.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {ticket.displayId}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="grid">
                        <span className="font-medium">
                          {ticket.requesterName || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ticket.requesterEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {ticket.teamName || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatArrival(ticket.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <ListPagination pathname="/tickets" meta={meta} query={listQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
