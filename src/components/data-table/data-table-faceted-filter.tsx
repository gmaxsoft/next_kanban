"use client";

import { useMemo } from "react";
import type { LegacyColumn } from "@tanstack/react-table/legacy";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 w-full min-w-28 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type FacetedFilterVariant = "text" | "select";

export function DataTableFacetedFilter<
  TData extends Record<string, unknown>,
  TValue,
>({
  column,
  variant = "text",
  placeholder,
  className,
}: {
  column: LegacyColumn<TData, TValue>;
  variant?: FacetedFilterVariant;
  placeholder?: string;
  className?: string;
}) {
  const columnFilterValue = column.getFilterValue();
  const faceted = column.getFacetedUniqueValues();

  const sortedUniqueValues = useMemo(() => {
    if (variant !== "select") {
      return [];
    }

    return Array.from(faceted.keys())
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
      .sort((a, b) => a.localeCompare(b, "pl"));
  }, [faceted, variant]);

  if (variant === "select") {
    return (
      <select
        className={cn(selectClassName, className)}
        value={
          typeof columnFilterValue === "string" ? columnFilterValue : ""
        }
        onChange={(event) => {
          const value = event.target.value;
          column.setFilterValue(value || undefined);
        }}
        aria-label={placeholder ?? "Filtr"}
      >
        <option value="">{placeholder ?? "Wszystkie"}</option>
        {sortedUniqueValues.map((value) => {
          const count = faceted.get(value) ?? 0;
          return (
            <option key={value} value={value}>
              {value} ({count})
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <Input
      className={cn("h-8 text-xs", className)}
      value={typeof columnFilterValue === "string" ? columnFilterValue : ""}
      onChange={(event) => {
        column.setFilterValue(event.target.value || undefined);
      }}
      placeholder={
        placeholder ??
        `Szukaj… (${column.getFacetedUniqueValues().size})`
      }
    />
  );
}
