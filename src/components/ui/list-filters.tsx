"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildListPath } from "@/lib/list-query";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 sm:min-w-44";

export type ListFilterSelect = {
  type: "select";
  name: string;
  label: string;
  value: string;
  emptyLabel?: string;
  options: { value: string; label: string }[];
  /** Clear these fields when this one changes */
  clear?: string[];
};

export type ListFilterSearch = {
  type: "search";
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  clear?: string[];
};

export type ListFilterField = ListFilterSearch | ListFilterSelect;

export function ListFilters({
  pathname,
  fields,
  preserve,
}: {
  pathname: string;
  fields: ListFilterField[];
  /** Kept across filter changes (e.g. pageSize). `page` is intentionally omitted to reset. */
  preserve?: Record<string, string | number | undefined | null>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);
  const initialValues = Object.fromEntries(
    fields.map((field) => [field.name, field.value]),
  );
  const [values, setValues] = useState(initialValues);

  function navigate(nextValues: Record<string, string>) {
    startTransition(() => {
      router.replace(
        buildListPath(pathname, {
          ...preserve,
          ...nextValues,
        }),
      );
    });
  }

  function update(field: ListFilterField, value: string, debounce = false) {
    const next = { ...values, [field.name]: value };
    for (const name of field.clear ?? []) {
      next[name] = "";
    }
    setValues(next);

    if (!debounce) {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      navigate(next);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      navigate(next);
    }, 350);
  }

  const hasFilters = fields.some((field) => Boolean(field.value));

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm lg:flex-row lg:items-end lg:flex-wrap"
      data-pending={isPending ? "" : undefined}
    >
      {fields.map((field) => {
        if (field.type === "search") {
          return (
            <div key={field.name} className="grid min-w-0 flex-1 gap-2">
              <Label htmlFor={`filter-${field.name}`}>{field.label}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`filter-${field.name}`}
                  value={values[field.name] ?? ""}
                  onChange={(event) =>
                    update(field, event.target.value, true)
                  }
                  placeholder={field.placeholder}
                  className="pl-8"
                />
              </div>
            </div>
          );
        }

        return (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={`filter-${field.name}`}>{field.label}</Label>
            <select
              id={`filter-${field.name}`}
              value={values[field.name] ?? ""}
              className={selectClassName}
              onChange={(event) => update(field, event.target.value)}
            >
              <option value="">{field.emptyLabel ?? "Wszystkie"}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="lg:mb-0.5"
          onClick={() => {
            if (debounceRef.current) {
              window.clearTimeout(debounceRef.current);
            }
            const cleared = Object.fromEntries(
              fields.map((field) => [field.name, ""]),
            );
            setValues(cleared);
            navigate(cleared);
          }}
        >
          <X />
          Wyczyść
        </Button>
      ) : null}
    </div>
  );
}
