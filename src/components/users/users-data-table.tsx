"use client";

import { useMemo, useState } from "react";
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

import { DeleteUserButton } from "@/components/auth/delete-user-button";
import { EditUserButton } from "@/components/auth/edit-user-button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatActiveStatus } from "@/lib/user";

export type UsersTableRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roleId: string;
  teamId: string | null;
  roleName: string;
  roleIsAdmin: boolean;
  teamName: string;
  statusLabel: string;
};

type Option = { id: string; name: string };

const columnHelper = legacyCreateColumnHelper<UsersTableRow>();

export function UsersDataTable({
  data,
  roles,
  teams,
  isAdmin,
  currentUserId,
  description,
}: {
  data: UsersTableRow[];
  roles: Option[];
  teams: Option[];
  isAdmin: boolean;
  currentUserId: string;
  description: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "isActive", desc: true },
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("name", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Imię" />
          ),
          cell: (info) => info.getValue(),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj imię…",
          },
        }),
        columnHelper.accessor("email", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="E-mail" />
          ),
          cell: (info) => info.getValue(),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj e-mail…",
          },
        }),
        columnHelper.accessor("roleName", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Rola" />
          ),
          cell: ({ row }) => (
            <Badge variant={row.original.roleIsAdmin ? "default" : "secondary"}>
              {row.original.roleName}
            </Badge>
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie role",
          },
        }),
        columnHelper.accessor("teamName", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Zespół" />
          ),
          cell: ({ getValue }) => {
            const value = getValue();
            return value === "—" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              value
            );
          },
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie zespoły",
          },
        }),
        columnHelper.accessor("statusLabel", {
          id: "isActive",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
          ),
          cell: ({ row }) => (
            <Badge variant={row.original.isActive ? "outline" : "destructive"}>
              {formatActiveStatus(row.original.isActive)}
            </Badge>
          ),
          sortFn: (a, b) =>
            Number(a.original.isActive) - Number(b.original.isActive),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie statusy",
          },
        }),
        columnHelper.accessor("createdAt", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Utworzono" />
          ),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">
              {new Date(getValue()).toLocaleDateString("pl-PL")}
            </span>
          ),
          enableColumnFilter: false,
          enableGlobalFilter: false,
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="font-medium">Akcje</span>,
          cell: ({ row }) => {
            const user = row.original;
            const canEdit = isAdmin || user.id === currentUserId;

            return (
              <div className="flex flex-wrap items-center gap-1">
                {canEdit ? (
                  <EditUserButton
                    user={{
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      roleId: user.roleId,
                      roleName: user.roleName,
                      teamId: user.teamId,
                      isActive: user.isActive,
                    }}
                    roles={roles}
                    teams={teams}
                    canManageRoleAndStatus={isAdmin}
                    canResetPassword={isAdmin}
                  />
                ) : null}
                {isAdmin && user.id !== currentUserId ? (
                  <DeleteUserButton userId={user.id} userName={user.name} />
                ) : null}
                {!canEdit && !(isAdmin && user.id !== currentUserId) ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : null}
              </div>
            );
          },
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
        }),
      ] as LegacyColumnDef<UsersTableRow>[],
    [isAdmin, currentUserId, roles, teams],
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
    globalFilterFn: "includesString",
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
    <>
      <CardHeader>
        <CardTitle>Zespół</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className="relative w-full min-w-[12rem] max-w-xs sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Szukaj w zespole…"
              aria-label="Szukaj w zespole"
              className="pl-8"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <DataTable
            table={table}
            emptyMessage="Brak użytkowników pasujących do filtrów."
          />
          <DataTablePagination table={table} />
        </div>
      </CardContent>
    </>
  );
}
