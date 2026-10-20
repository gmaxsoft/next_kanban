"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LegacyReactTable } from "@tanstack/react-table/legacy";

import { Button } from "@/components/ui/button";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function DataTablePagination<TData extends Record<string, unknown>>({
  table,
}: {
  table: LegacyReactTable<TData>;
}) {
  const filtered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const from = filtered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(filtered, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        {filtered === 0
          ? "Brak wyników"
          : `Wiersze ${from}–${to} z ${filtered}`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-muted-foreground">
          Na stronie
          <select
            className={selectClassName}
            value={pageSize}
            onChange={(event) => {
              table.setPageSize(Number(event.target.value));
            }}
          >
            {[10, 20, 30, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Poprzednia strona"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-16 text-center text-muted-foreground">
            {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Następna strona"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
