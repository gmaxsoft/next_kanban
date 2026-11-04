"use client";

import { useEffect, useState } from "react";
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

export type DataTablePersistedState = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  pagination: PaginationState;
};

const STORAGE_PREFIX = "helpdesk:datatable:";

function isSortingState(value: unknown): value is SortingState {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { desc?: unknown }).desc === "boolean",
    )
  );
}

function isColumnFiltersState(value: unknown): value is ColumnFiltersState {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "string" &&
        "value" in (item as object),
    )
  );
}

function readStoredState(
  tableId: string,
): Partial<DataTablePersistedState> | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<DataTablePersistedState>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists TanStack table UI state (filters, search, sorting, pagination)
 * in localStorage so selections survive refresh.
 */
export function useDataTableState(
  tableId: string,
  defaults: Partial<DataTablePersistedState> = {},
) {
  const defaultSorting = defaults.sorting ?? [];
  const defaultColumnFilters = defaults.columnFilters ?? [];
  const defaultGlobalFilter = defaults.globalFilter ?? "";
  const defaultPagination = defaults.pagination ?? {
    pageIndex: 0,
    pageSize: 20,
  };

  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(defaultColumnFilters);
  const [globalFilter, setGlobalFilter] = useState(defaultGlobalFilter);
  const [pagination, setPagination] =
    useState<PaginationState>(defaultPagination);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredState(tableId);
    if (stored) {
      if (isSortingState(stored.sorting)) {
        setSorting(stored.sorting);
      }
      if (isColumnFiltersState(stored.columnFilters)) {
        setColumnFilters(stored.columnFilters);
      }
      if (typeof stored.globalFilter === "string") {
        setGlobalFilter(stored.globalFilter);
      }
      if (
        stored.pagination &&
        typeof stored.pagination.pageIndex === "number" &&
        typeof stored.pagination.pageSize === "number"
      ) {
        setPagination({
          pageIndex: Math.max(0, stored.pagination.pageIndex),
          pageSize: stored.pagination.pageSize > 0 ? stored.pagination.pageSize : 20,
        });
      }
    }
    setReady(true);
  }, [tableId]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    try {
      const payload: DataTablePersistedState = {
        sorting,
        columnFilters,
        globalFilter,
        pagination,
      };
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${tableId}`,
        JSON.stringify(payload),
      );
    } catch {
      // ignore quota / private mode
    }
  }, [ready, tableId, sorting, columnFilters, globalFilter, pagination]);

  return {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    pagination,
    setPagination,
  };
}
