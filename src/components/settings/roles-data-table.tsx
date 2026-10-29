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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type RolesTableRow = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  isAdmin: boolean;
  isRestricted: boolean;
  userCount: number;
  permissionLabel: string;
  searchText: string;
};

const columnHelper = legacyCreateColumnHelper<RolesTableRow>();

export function RolesDataTable({
  data,
  canManage,
  renderActions,
}: {
  data: RolesTableRow[];
  canManage: boolean;
  renderActions?: (role: RolesTableRow) => ReactNode;
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
                {row.original.slug}
              </div>
            </div>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj nazwę…",
          },
        }),
        columnHelper.accessor("permissionLabel", {
          id: "permission",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Uprawnienia" />
          ),
          cell: ({ row }) => (
            <Badge variant={row.original.isAdmin ? "default" : "secondary"}>
              {row.original.permissionLabel}
            </Badge>
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie uprawnienia",
          },
        }),
        columnHelper.accessor("userCount", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Użytkownicy" />
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
      ] as LegacyColumnDef<RolesTableRow>[],
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
          placeholder="Szukaj ról…"
          aria-label="Szukaj ról"
          className="pl-8"
        />
      </div>
      <div className="rounded-md border bg-muted/40 px-3 py-2">
        <DataTable
          table={table}
          emptyMessage="Brak ról pasujących do filtrów."
        />
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
