"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TaskCard } from "@/components/kanban/task-card";
import type { BoardTask } from "@/lib/kanban";
import { cn } from "@/lib/utils";

export function SortableTaskCard({
  task,
  onOpen,
}: {
  task: BoardTask;
  onOpen: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;
    }
  }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "cursor-grab touch-none",
        isDragging && "z-10 cursor-grabbing opacity-60",
      )}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Otwórz zadanie ${task.title}`}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }

        onOpen(task.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
    >
      <TaskCard task={task} />
    </div>
  );
}
