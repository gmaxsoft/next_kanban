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
import type { Priority } from "@prisma/client";
import { toast } from "sonner";

import { reorderTasks } from "@/app/actions/tasks";
import { PriorityBadge } from "@/components/kanban/priority-badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  reorderRowsById,
  RowDragHandleCell,
} from "@/components/data-table/data-table-row-dnd";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/user";

export type TasksTableAssignee = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type TasksTableRow = {
  id: string;
  title: string;
  boardId: string;
  boardTitle: string;
  teamName: string;
  columnTitle: string;
  priority: Priority;
  priorityLabel: string;
  dueDate: string | null;
  assignees: TasksTableAssignee[];
  assigneeNames: string;
  searchText: string;
};

const columnHelper = legacyCreateColumnHelper<TasksTableRow>();

function formatDueDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pl-PL", {
    dateStyle: "medium",
  });
}

export function TasksDataTable({
  data,
  isAdmin,
  description,
}: {
  data: TasksTableRow[];
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
        columnHelper.accessor("title", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Zadanie" />
          ),
          cell: ({ row }) => (
            <div>
              <Link
                href={`/boards/${row.original.boardId}/tasks/${row.original.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {row.original.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {row.original.boardTitle}
              </p>
            </div>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj tytuł…",
          },
        }),
        columnHelper.accessor("teamName", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Zespół" />
          ),
          cell: ({ getValue }) => (
            <Badge variant="outline">{getValue()}</Badge>
          ),
          filterFn: "equalsString",
          enableColumnFilter: isAdmin,
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie zespoły",
          },
        }),
        columnHelper.accessor("boardTitle", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Tablica" />
          ),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue()}</span>
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie tablice",
          },
        }),
        columnHelper.accessor("columnTitle", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
          ),
          cell: ({ getValue }) => (
            <Badge variant="secondary">{getValue()}</Badge>
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie statusy",
          },
        }),
        columnHelper.accessor("assigneeNames", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Załoga" />
          ),
          cell: ({ row }) => (
            <div className="flex flex-wrap items-center gap-2">
              {row.original.assignees.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                row.original.assignees.map((assignee) => (
                  <span
                    key={assignee.id}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Avatar size="sm" className="size-5">
                      <AvatarImage
                        src={assignee.avatarUrl ?? undefined}
                        alt={assignee.name}
                      />
                      <AvatarFallback className="text-[9px]">
                        {getInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{assignee.name}</span>
                  </span>
                ))
              )}
            </div>
          ),
          filterFn: "includesString",
          meta: {
            filterVariant: "text",
            filterPlaceholder: "Filtruj załogę…",
          },
        }),
        columnHelper.accessor("dueDate", {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Termin" />
          ),
          cell: ({ getValue }) => formatDueDate(getValue()),
          sortFn: (a, b) => {
            const aVal = a.original.dueDate
              ? new Date(a.original.dueDate).getTime()
              : Number.POSITIVE_INFINITY;
            const bVal = b.original.dueDate
              ? new Date(b.original.dueDate).getTime()
              : Number.POSITIVE_INFINITY;
            return aVal - bVal;
          },
          enableColumnFilter: false,
          enableGlobalFilter: false,
        }),
        columnHelper.accessor("priorityLabel", {
          id: "priority",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Priorytet" />
          ),
          cell: ({ row }) => (
            <PriorityBadge priority={row.original.priority} />
          ),
          filterFn: "equalsString",
          meta: {
            filterVariant: "select",
            filterPlaceholder: "Wszystkie priorytety",
          },
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
                  href={`/boards/${row.original.boardId}/tasks/${row.original.id}`}
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
      ] as LegacyColumnDef<TasksTableRow>[],
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
      void reorderTasks(orderedIds).then((result) => {
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
        <CardTitle>Ostatnie zadania</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className="relative w-full min-w-[12rem] max-w-xs sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Szukaj zadań…"
              aria-label="Szukaj zadań"
              className="pl-8"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <DataTable
            table={table}
            emptyMessage="Brak zadań pasujących do filtrów."
            enableRowDnd
            onRowDragEnd={handleRowDragEnd}
          />
          <DataTablePagination table={table} />
        </div>
      </CardContent>
    </>
  );
}
