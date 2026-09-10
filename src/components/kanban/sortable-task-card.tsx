"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TaskCard } from "@/components/kanban/task-card";
import type { BoardTask } from "@/lib/kanban";
import { cn } from "@/lib/utils";

export function SortableTaskCard({ task }: { task: BoardTask }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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
    >
      <TaskCard task={task} />
    </div>
  );
}
