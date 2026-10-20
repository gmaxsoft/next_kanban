"use client";

import { flexRender } from "@tanstack/react-table";
import type { LegacyReactTable } from "@tanstack/react-table/legacy";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import {
  DataTableRowDndProvider,
  DraggableRow,
  StaticTableRow,
  useClientRowDnd,
} from "@/components/data-table/data-table-row-dnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ColumnFilterMeta = {
  filterVariant?: "text" | "select";
  filterPlaceholder?: string;
};

export function DataTable<TData extends Record<string, unknown>>({
  table,
  emptyMessage = "Brak danych.",
  className,
  enableRowDnd = false,
  onRowDragEnd,
}: {
  table: LegacyReactTable<TData>;
  emptyMessage?: string;
  className?: string;
  enableRowDnd?: boolean;
  onRowDragEnd?: (event: DragEndEvent) => void;
}) {
  const rowDndActive = useClientRowDnd(Boolean(enableRowDnd && onRowDragEnd));
  const hasFilters = table.getState().columnFilters.length > 0;
  const rows = table.getRowModel().rows;
  const rowIds = rows.map((row) => row.id) as UniqueIdentifier[];

  const body = (
    <tbody>
      {rows.length === 0 ? (
        <tr>
          <td
            colSpan={table.getAllColumns().length}
            className="py-6 text-sm text-muted-foreground"
          >
            {emptyMessage}
          </td>
        </tr>
      ) : rowDndActive ? (
        rows.map((row) => (
          <DraggableRow
            key={row.id}
            row={row}
            inactive={
              (row.original as { isActive?: boolean }).isActive === false
            }
          />
        ))
      ) : (
        rows.map((row) => (
          <StaticTableRow
            key={row.id}
            row={row}
            inactive={
              (row.original as { isActive?: boolean }).isActive === false
            }
          />
        ))
      )}
    </tbody>
  );

  const tableNode = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="border-b text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="py-2 pr-4 font-medium last:pr-0"
                  colSpan={header.colSpan}
                >
                  {header.isPlaceholder ? null : (
                    <div className="grid gap-1.5">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getCanFilter() ? (
                        <DataTableFacetedFilter
                          column={header.column}
                          variant={
                            (
                              header.column.columnDef.meta as
                                | ColumnFilterMeta
                                | undefined
                            )?.filterVariant ?? "text"
                          }
                          placeholder={
                            (
                              header.column.columnDef.meta as
                                | ColumnFilterMeta
                                | undefined
                            )?.filterPlaceholder
                          }
                        />
                      ) : null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        {body}
      </table>
    </div>
  );

  return (
    <div className={cn("grid gap-4", className)}>
      {hasFilters ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Wyczyść filtry
          </Button>
        </div>
      ) : null}

      {rowDndActive && onRowDragEnd ? (
        <DataTableRowDndProvider items={rowIds} onDragEnd={onRowDragEnd}>
          {tableNode}
        </DataTableRowDndProvider>
      ) : (
        tableNode
      )}
    </div>
  );
}
