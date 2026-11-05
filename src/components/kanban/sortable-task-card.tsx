"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TaskCard } from "@/components/kanban/task-card";
import { TaskContextMenu } from "@/components/kanban/task-context-menu";
import type { BoardTask } from "@/lib/kanban";
import { cn } from "@/lib/utils";

export function SortableTaskCard({
  boardId,
  task,
  canDelete,
  canDrag,
  onOpen,
}: {
  boardId: string;
  task: BoardTask;
  canDelete: boolean;
  canDrag: boolean;
  onOpen: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canDrag });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;
    }
  }, [isDragging]);

  return (
    <TaskContextMenu
      boardId={boardId}
      taskId={task.id}
      taskTitle={task.title}
      canDelete={canDelete}
    >
      {({ onContextMenu }) => (
        <div
          ref={setNodeRef}
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
          }}
          className={cn(
            "touch-none",
            canDrag ? "cursor-grab" : "cursor-pointer",
            isDragging && "z-10 cursor-grabbing opacity-60",
          )}
          {...attributes}
          {...(canDrag ? listeners : {})}
          role="button"
          tabIndex={0}
          aria-label={`Otwórz zadanie ${task.title}`}
          title={
            canDrag
              ? undefined
              : "Przenosić mogą tylko osoby przypisane do zadania lub administrator."
          }
          onContextMenu={onContextMenu}
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
      )}
    </TaskContextMenu>
  );
}
