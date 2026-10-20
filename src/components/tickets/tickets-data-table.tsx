"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import type { DragEndEvent } from "@dnd-kit/core";
import { Eye, Search } from "lucide-react";
import type { Priority, TicketStatus } from "@prisma/client";
import { toast } from "sonner";

import { reorderTickets } from "@/app/actions/tickets";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  reorderRowsById,
  RowDragHandleCell,
} from "@/components/data-table/data-table-row-dnd";
import { TicketPrioritySelect } from "@/components/tickets/ticket-priority-select";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type TicketsTableRow = {
  id: string;
  displayId: string;
  subject: string;
  status: TicketStatus;
  statusLabel: string;
  priority: Priority;
  priorityLabel: string;
  requesterEmail: string;
  requesterDisplay: string;
  assigneeName: string;
  teamName: string;
  createdAt: string;
  searchText: string;
};

const columnHelper = legacyCreateColumnHelper<TicketsTableRow>();

function formatArrival(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function TicketsDataTable({
  data,
  isAdmin,
  description,
}: {
  data: TicketsTableRow[];
  isAdmin: boolean;
  description: string;
}) {
  const [rows, setRows] = useState(data);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setRows(data);
  }, [data]);

  const columns = useMemo(
    () =>
      [
        columnHelper.display({
          id: "drag-handle",
          header: () => <span className="sr-only">Kolejność</span>,
          cell: ({ row }) => <RowDragHandleCell rowId={row.id} />,
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
          size: 40,
        }),
        columnHelper.accessor("displayId", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ID" />
          ),
          cell: ({ row }) => (
            <span className="font-mono text-xs font-semibold">
              {row.original.displayId}
            </span>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj ID…",
          },
        }),
        columnHelper.accessor("subject", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Temat" />
          ),
          cell: ({ getValue }) => (
            <span className="font-medium">{getValue()}</span>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj temat…",
          },
        }),
        columnHelper.accessor("requesterDisplay", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Od kogo" />
          ),
          cell: ({ row }) => (
            <div className="grid">
              <span className="font-medium">{row.original.requesterDisplay}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.requesterEmail}
              </span>
            </div>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj nadawcę…",
          },
        }),
        columnHelper.accessor("assigneeName", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Odpowiedzialny" />
          ),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue()}</span>
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszyscy",
          },
        }),
        columnHelper.accessor("teamName", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Zespół" />
          ),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue()}</span>
          ),
          filterFn: "equalsString",
          enableColumnFilter: isAdmin,
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie zespoły",
          },
        }),
        columnHelper.accessor("priorityLabel", {
          id: "priority",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Priorytet" />
          ),
          cell: ({ row }) => (
            <TicketPrioritySelect
              ticketId={row.original.id}
              priority={row.original.priority}
            />
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie priorytety",
          },
        }),
        columnHelper.accessor("statusLabel", {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
          ),
          cell: ({ row }) => (
            <TicketStatusBadge status={row.original.status} />
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie statusy",
          },
        }),
        columnHelper.accessor("createdAt", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Data przybycia" />
          ),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">
              {formatArrival(getValue())}
            </span>
          ),
          enableColumnFilter: false,
          enableGlobalFilter: false,
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="font-medium">Akcje</span>,
          cell: ({ row }) => (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/tickets/${row.original.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Eye />
              Zobacz
            </Button>
          ),
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
        }),
      ] as LegacyColumnDef<TicketsTableRow>[],
    [isAdmin],
  );

  const table = useLegacyTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!q) {
        return true;
      }
      return row.original.searchText.includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  });

  function handleRowDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setSorting([]);
    const next = reorderRowsById(rows, active.id, over.id);
    setRows(next);
    const orderedIds = next.map((row) => row.id);
    startTransition(() => {
      void reorderTickets(orderedIds).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          setRows(data);
          return;
        }
        toast.success(result?.success ?? "Zapisano kolejność.");
      });
    });
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Lista ticketów</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className="relative w-full min-w-[12rem] max-w-xs sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="temat, nadawca, T-101…"
              aria-label="Szukaj ticketów"
              className="pl-8"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <DataTable
            table={table}
            emptyMessage="Brak ticketów pasujących do filtrów."
            enableRowDnd
            onRowDragEnd={handleRowDragEnd}
          />
          <DataTablePagination table={table} />
        </div>
      </CardContent>
    </>
  );
}
