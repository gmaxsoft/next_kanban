"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { boardPath, type BoardView } from "@/lib/board-query";
import type { BoardMember } from "@/lib/kanban";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 sm:w-56";

export function BoardFilters({
  boardId,
  q,
  assignee,
  taskId,
  view,
  members,
}: {
  boardId: string;
  q: string;
  assignee: string;
  taskId: string;
  view: BoardView;
  members: BoardMember[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  function go(next: { q?: string; assignee?: string }) {
    startTransition(() => {
      router.replace(
        boardPath(boardId, {
          q: next.q ?? query,
          assignee: next.assignee ?? assignee,
          taskId,
          view,
        }),
      );
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      startTransition(() => {
        router.replace(boardPath(boardId, { q: value, assignee, taskId, view }));
      });
    }, 350);
  }

  const hasFilters = Boolean(q || assignee);

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-end"
      data-pending={isPending ? "" : undefined}
    >
      <div className="grid min-w-0 flex-1 gap-2">
        <Label htmlFor="board-search">Szukaj po nazwie</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="board-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="np. logowanie, API, design..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="board-assignee">Przypisana osoba</Label>
        <select
          id="board-assignee"
          value={assignee}
          className={selectClassName}
          onChange={(event) => go({ assignee: event.target.value })}
        >
          <option value="">Wszyscy</option>
          <option value="unassigned">Nieprzypisane</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="sm:mb-0.5"
          onClick={() => {
            if (debounceRef.current) {
              window.clearTimeout(debounceRef.current);
            }
            setQuery("");
            startTransition(() => {
              router.replace(boardPath(boardId, { taskId, view }));
            });
          }}
        >
          <X />
          Wyczyść
        </Button>
      ) : null}
    </div>
  );
}
