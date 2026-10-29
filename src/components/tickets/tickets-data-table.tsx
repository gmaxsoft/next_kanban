"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
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
import { Eye, GitMerge, Search } from "lucide-react";
import type { Priority, TicketStatus } from "@prisma/client";
import { toast } from "sonner";

import { mergeTickets, reorderTickets } from "@/app/actions/tickets";
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
import {
  DraggableDialog,
  DraggableDialogContent,
} from "@/components/ui/draggable-dialog";
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
  const router = useRouter();
  const [rows, setRows] = useState(data);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [mergeOpen, setMergeOpen] = useState(false);
  const [primaryTicketId, setPrimaryTicketId] = useState("");
  const [, startTransition] = useTransition();
  const [mergePending, startMergeTransition] = useTransition();

  useEffect(() => {
    setRows(data);
  }, [data]);

  const columns = useMemo(
    () =>
      [
        columnHelper.display({
          id: "select",
          header: ({ table }) => (
            <input
              type="checkbox"
              className="size-4 accent-primary"
              aria-label="Zaznacz wszystkie na stronie"
              checked={table.getIsAllPageRowsSelected()}
              ref={(element) => {
                if (element) {
                  element.indeterminate = table.getIsSomePageRowsSelected();
                }
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              className="size-4 accent-primary"
              aria-label={`Zaznacz ${row.original.displayId}`}
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(event) => event.stopPropagation()}
            />
          ),
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
          size: 36,
        }),
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
            <DataTableColumnHeader column={column} title="Zgłaszający" />
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
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
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

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const selectedCount = selectedRows.length;

  function openMergeDialog() {
    if (selectedCount < 2) {
      return;
    }
    const sorted = [...selectedRows].sort((a, b) =>
      a.displayId.localeCompare(b.displayId, "pl"),
    );
    setPrimaryTicketId(sorted[0]?.id ?? "");
    setMergeOpen(true);
  }

  function handleMerge() {
    if (!primaryTicketId || selectedCount < 2) {
      return;
    }
    const sourceTicketIds = selectedRows
      .map((row) => row.id)
      .filter((id) => id !== primaryTicketId);

    startMergeTransition(() => {
      void mergeTickets({ primaryTicketId, sourceTicketIds }).then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result.success ?? "Scalono tickety.");
        setMergeOpen(false);
        setRowSelection({});
        router.refresh();
        if (result.primaryTicketId) {
          router.push(`/tickets/${result.primaryTicketId}`);
        }
      });
    });
  }

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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedCount >= 2 ? (
              <Button type="button" size="sm" onClick={openMergeDialog}>
                <GitMerge />
                Połącz tickety ({selectedCount})
              </Button>
            ) : null}
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

      <DraggableDialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DraggableDialogContent
          title="Połącz tickety"
          description="Wybierz ticket główny. Historia pozostałych zostanie przeniesiona do niego, a źródła znikną z listy."
          open={mergeOpen}
        >
          <div className="grid gap-4 p-4">
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Ticket główny</legend>
              {selectedRows
                .slice()
                .sort((a, b) => a.displayId.localeCompare(b.displayId, "pl"))
                .map((ticket) => (
                  <label
                    key={ticket.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/80 px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="primaryTicketId"
                      className="mt-0.5 size-4 accent-primary"
                      value={ticket.id}
                      checked={primaryTicketId === ticket.id}
                      onChange={() => setPrimaryTicketId(ticket.id)}
                    />
                    <span className="min-w-0">
                      <span className="font-mono font-semibold">
                        {ticket.displayId}
                      </span>
                      <span className="mt-0.5 block truncate text-muted-foreground">
                        {ticket.subject}
                      </span>
                    </span>
                  </label>
                ))}
            </fieldset>
            <p className="text-xs text-muted-foreground">
              Pozostałe zaznaczone tickety zostaną oznaczone jako scalone
              (rozwiązane) i przekierują na ticket główny.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={mergePending || !primaryTicketId}
                onClick={handleMerge}
              >
                {mergePending ? "Scalanie..." : "Scal tickety"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={mergePending}
                onClick={() => setMergeOpen(false)}
              >
                Anuluj
              </Button>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>
    </>
  );
}
