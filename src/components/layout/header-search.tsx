"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Columns3, ListTodo, Search } from "lucide-react";

import {
  searchApp,
  type GlobalSearchResult,
} from "@/app/actions/search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const emptyResult: GlobalSearchResult = { boards: [], tasks: [] };

export function HeaderSearch({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult>(emptyResult);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResult(emptyResult);
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const next = await searchApp(trimmed);
        setResult(next);
        setOpen(true);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const hasHits = result.boards.length > 0 || result.tasks.length > 0;
  const showPanel = open && query.trim().length >= 2;

  function submitSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setOpen(false);

    if (result.tasks.length === 1 && result.boards.length === 0) {
      router.push(result.tasks[0].href);
      return;
    }

    if (result.boards.length === 1 && result.tasks.length === 0) {
      router.push(result.boards[0].href);
      return;
    }

    if (isAdmin) {
      router.push(`/tasks?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    router.push(`/boards?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div ref={rootRef} className="relative hidden w-64 md:block">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Szukaj tablic i zadań..."
        className="h-8 pl-8"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) {
            setOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            submitSearch();
          }
        }}
      />

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-50 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {isPending && !hasHits ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Szukam…</p>
          ) : !hasHits ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Brak wyników dla „{query.trim()}”.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {result.boards.length > 0 ? (
                <div className="px-1 pb-1">
                  <p className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Tablice
                  </p>
                  {result.boards.map((board) => (
                    <Link
                      key={board.id}
                      href={board.href}
                      role="option"
                      className={cn(
                        "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
                        "hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <Columns3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {board.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {board.teamName}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {result.tasks.length > 0 ? (
                <div className="px-1 pb-1">
                  <p className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Zadania
                  </p>
                  {result.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={task.href}
                      role="option"
                      className={cn(
                        "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
                        "hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <ListTodo className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {task.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {task.boardTitle}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
