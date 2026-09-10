"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { AddTaskForm } from "@/components/kanban/add-task-form";
import { SortableTaskCard } from "@/components/kanban/sortable-task-card";
import type { BoardColumn } from "@/lib/kanban";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  column,
  boardId,
}: {
  column: BoardColumn;
  boardId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-xl bg-muted/50 p-3",
        isOver && "ring-2 ring-primary/30",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold tracking-tight">{column.title}</h3>
        <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
          {column.tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className="flex min-h-28 flex-1 flex-col gap-2 overflow-y-auto"
      >
        <SortableContext
          items={column.tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      <AddTaskForm boardId={boardId} columnId={column.id} />
    </section>
  );
}
