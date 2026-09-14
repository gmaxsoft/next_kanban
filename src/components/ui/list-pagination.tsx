"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildListPath,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PaginationMeta,
} from "@/lib/list-query";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function ListPagination({
  pathname,
  meta,
  query = {},
}: {
  pathname: string;
  meta: PaginationMeta;
  query?: Record<string, string | number | undefined | null>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (meta.total === 0) {
    return null;
  }

  const from = meta.skip + 1;
  const to = Math.min(meta.skip + meta.pageSize, meta.total);
  const baseQuery = {
    ...query,
    pageSize: meta.pageSize === DEFAULT_PAGE_SIZE ? undefined : meta.pageSize,
  };

  const prevHref =
    meta.page > 1
      ? buildListPath(pathname, { ...baseQuery, page: meta.page - 1 })
      : null;
  const nextHref =
    meta.page < meta.totalPages
      ? buildListPath(pathname, { ...baseQuery, page: meta.page + 1 })
      : null;

  return (
    <div
      className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
      data-pending={isPending ? "" : undefined}
    >
      <p className="text-sm text-muted-foreground">
        {from}–{to} z {meta.total}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Na stronie
          <select
            className={selectClassName}
            value={meta.pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              startTransition(() => {
                router.replace(
                  buildListPath(pathname, {
                    ...query,
                    page: 1,
                    pageSize: nextSize,
                  }),
                );
              });
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          {prevHref ? (
            <Button variant="outline" size="sm" render={<Link href={prevHref} />}>
              <ChevronLeft />
              Poprzednia
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft />
              Poprzednia
            </Button>
          )}
          <span className="px-2 text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          {nextHref ? (
            <Button variant="outline" size="sm" render={<Link href={nextHref} />}>
              Następna
              <ChevronRight />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Następna
              <ChevronRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
