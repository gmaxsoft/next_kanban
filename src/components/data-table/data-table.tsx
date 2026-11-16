"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
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

const HORIZONTAL_SCROLL_STEP = 96;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable=true], [role='combobox'], [role='listbox'], [role='menu'], [role='option']",
    ),
  );
}

function scrollHorizontally(
  element: HTMLElement,
  direction: "left" | "right",
) {
  const maxScroll = element.scrollWidth - element.clientWidth;
  if (maxScroll <= 0) {
    return false;
  }

  const delta =
    direction === "left" ? -HORIZONTAL_SCROLL_STEP : HORIZONTAL_SCROLL_STEP;
  const next = Math.max(0, Math.min(maxScroll, element.scrollLeft + delta));
  if (next === element.scrollLeft) {
    return false;
  }

  element.scrollTo({ left: next, behavior: "smooth" });
  return true;
}

/** Horizontal overflow area: arrow keys scroll when hovered or focused. */
function DataTableScrollArea({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);

  useEffect(() => {
    function onWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      if (!hoveredRef.current || isEditableTarget(event.target)) {
        return;
      }

      const element = ref.current;
      if (!element) {
        return;
      }

      const scrolled = scrollHorizontally(
        element,
        event.key === "ArrowLeft" ? "left" : "right",
      );
      if (scrolled) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const scrolled = scrollHorizontally(
      element,
      event.key === "ArrowLeft" ? "left" : "right",
    );
    if (scrolled) {
      event.preventDefault();
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="region"
      aria-label="Tabela — strzałki w lewo i w prawo przewijają poziomo"
      className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

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
    <DataTableScrollArea>
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
    </DataTableScrollArea>
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
