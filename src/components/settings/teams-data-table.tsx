"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { Search } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";

export type TeamsTableRow = {
  id: string;
  name: string;
  description: string | null;
  inboundEmail: string | null;
  inboundType: "WEBHOOK" | "IMAP";
  inboundTypeLabel: string;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapSecure: boolean;
  imapMailbox: string | null;
  imapAllowedSenderDomains: string;
  hasImapPassword: boolean;
  userCount: number;
  searchText: string;
};

const columnHelper = legacyCreateColumnHelper<TeamsTableRow>();

export function TeamsDataTable({
  data,
  canManage,
  renderActions,
}: {
  data: TeamsTableRow[];
  canManage: boolean;
  renderActions?: (team: TeamsTableRow) => ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("name", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nazwa" />
          ),
          cell: ({ row }) => (
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-xs text-muted-foreground">
                {row.original.description || "—"}
              </div>
            </div>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj nazwę…",
          },
        }),
        columnHelper.accessor("inboundEmail", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Skrzynka" />
          ),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue() || "—"}</span>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj skrzynkę…",
          },
        }),
        columnHelper.accessor("inboundTypeLabel", {
          id: "inboundType",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Tryb" />
          ),
          cell: ({ getValue }) => getValue(),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie tryby",
          },
        }),
        columnHelper.accessor("userCount", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Członkowie" />
          ),
          cell: ({ getValue }) => getValue(),
          enableColumnFilter: false,
          enableGlobalFilter: false,
        }),
        ...(canManage
          ? [
              columnHelper.display({
                id: "actions",
                header: () => <span className="font-medium">Akcje</span>,
                cell: ({ row }) => (
                  <div className="flex flex-wrap gap-1">
                    {renderActions?.(row.original)}
                  </div>
                ),
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
              }),
            ]
          : []),
      ] as LegacyColumnDef<TeamsTableRow>[],
    [canManage, renderActions],
  );

  const table = useLegacyTable({
    data,
    columns,
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

  return (
    <div className="grid gap-4">
      <div className="relative w-full max-w-xs sm:ml-auto sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Szukaj zespołów…"
          aria-label="Szukaj zespołów"
          className="pl-8"
        />
      </div>
      <DataTable
        table={table}
        emptyMessage="Brak zespołów pasujących do filtrów."
      />
      <DataTablePagination table={table} />
    </div>
  );
}
