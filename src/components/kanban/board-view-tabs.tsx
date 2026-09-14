"use client";

import Link from "next/link";
import { Columns3, List } from "lucide-react";

import { boardPath, type BoardView } from "@/lib/board-query";
import { cn } from "@/lib/utils";

const tabs: { view: BoardView; label: string; icon: typeof Columns3 }[] = [
  { view: "board", label: "Tablica", icon: Columns3 },
  { view: "list", label: "Lista", icon: List },
];

export function BoardViewTabs({
  boardId,
  view,
  q,
  assignee,
  taskId,
}: {
  boardId: string;
  view: BoardView;
  q: string;
  assignee: string;
  taskId: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Widok tablicy"
      className="inline-flex w-fit border border-border bg-muted/40 p-0.5"
    >
      {tabs.map((tab) => {
        const isActive = view === tab.view;
        const href = boardPath(boardId, {
          q,
          assignee,
          taskId,
          view: tab.view,
        });

        return (
          <Link
            key={tab.view}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
