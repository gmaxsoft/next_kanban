"use client";

import {
  TicketsDataTable,
  type TicketsTableRow,
} from "@/components/tickets/tickets-data-table";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ticketsCountLabel(count: number) {
  if (count === 0) {
    return "Brak zgłoszeń.";
  }
  const noun =
    count === 1 ? "ticket" : count < 5 ? "tickety" : "ticketów";
  return `${count} ${noun} · sortowanie i filtry kolumn (TanStack Table)`;
}

export function TicketsListTabs({
  currentRows,
  archiveRows,
  isAdmin,
}: {
  currentRows: TicketsTableRow[];
  archiveRows: TicketsTableRow[];
  isAdmin: boolean;
}) {
  return (
    <Tabs defaultValue="current" className="gap-0">
      <TabsList variant="line">
        <TabsTrigger value="current">
          Bieżące ({currentRows.length})
        </TabsTrigger>
        <TabsTrigger value="archive">
          Archiwalne ({archiveRows.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="current" className="mt-4">
        <Card>
          <TicketsDataTable
            data={currentRows}
            isAdmin={isAdmin}
            tableId="tickets-current"
            title="Bieżące tickety"
            description={ticketsCountLabel(currentRows.length)}
          />
        </Card>
      </TabsContent>

      <TabsContent value="archive" className="mt-4">
        <Card>
          <TicketsDataTable
            data={archiveRows}
            isAdmin={isAdmin}
            tableId="tickets-archive"
            title="Archiwalne tickety"
            description={
              archiveRows.length === 0
                ? "Brak zgłoszeń rozwiązanych lub zamkniętych."
                : `${ticketsCountLabel(archiveRows.length)} · statusy Rozwiązane i Zamknięte`
            }
          />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
