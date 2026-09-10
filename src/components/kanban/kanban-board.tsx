"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { useRouter } from "next/navigation";

import { moveTask } from "@/app/actions/boards";
import { KanbanColumn } from "@/components/kanban/board-column";
import { TaskCard } from "@/components/kanban/task-card";
import { boardPath } from "@/lib/board-query";
import type { BoardColumn, BoardTask } from "@/lib/kanban";

function findColumnId(columns: BoardColumn[], id: UniqueIdentifier) {
  const value = String(id);

  if (columns.some((column) => column.id === value)) {
    return value;
  }

  return columns.find((column) => column.tasks.some((task) => task.id === value))
    ?.id;
}

function moveBetweenColumns(
  columns: BoardColumn[],
  activeId: string,
  overId: string,
) {
  const fromColumnId = findColumnId(columns, activeId);
  const toColumnId = findColumnId(columns, overId);

  if (!fromColumnId || !toColumnId || fromColumnId === toColumnId) {
    return columns;
  }

  const fromColumn = columns.find((column) => column.id === fromColumnId);
  const toColumn = columns.find((column) => column.id === toColumnId);
  const task = fromColumn?.tasks.find((item) => item.id === activeId);

  if (!fromColumn || !toColumn || !task) {
    return columns;
  }

  const overIndex = toColumn.tasks.findIndex((item) => item.id === overId);
  const insertAt = overIndex >= 0 ? overIndex : toColumn.tasks.length;

  return columns.map((column) => {
    if (column.id === fromColumnId) {
      return {
        ...column,
        tasks: column.tasks.filter((item) => item.id !== activeId),
      };
    }

    if (column.id === toColumnId) {
      const withoutActive = column.tasks.filter((item) => item.id !== activeId);
      return {
        ...column,
        tasks: [
          ...withoutActive.slice(0, insertAt),
          task,
          ...withoutActive.slice(insertAt),
        ],
      };
    }

    return column;
  });
}

function reorderInColumn(
  columns: BoardColumn[],
  activeId: string,
  overId: string,
) {
  const columnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!columnId || columnId !== overColumnId) {
    return columns;
  }

  const column = columns.find((item) => item.id === columnId);

  if (!column) {
    return columns;
  }

  const fromIndex = column.tasks.findIndex((task) => task.id === activeId);
  const toIndex =
    overId === columnId
      ? column.tasks.length - 1
      : column.tasks.findIndex((task) => task.id === overId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return columns;
  }

  return columns.map((item) =>
    item.id === columnId
      ? { ...item, tasks: arrayMove(item.tasks, fromIndex, toIndex) }
      : item,
  );
}

function placementOf(columns: BoardColumn[], taskId: string) {
  const column = columns.find((item) =>
    item.tasks.some((task) => task.id === taskId),
  );

  if (!column) {
    return null;
  }

  return {
    columnId: column.id,
    index: column.tasks.findIndex((task) => task.id === taskId),
  };
}

function persistMove(boardId: string, columns: BoardColumn[], taskId: string) {
  const placement = placementOf(columns, taskId);

  if (!placement) {
    return;
  }

  void moveTask({
    boardId,
    taskId,
    toColumnId: placement.columnId,
    toIndex: placement.index,
  });
}

export function KanbanBoard({
  boardId,
  columns: initialColumns,
  q,
  assignee,
}: {
  boardId: string;
  columns: BoardColumn[];
  q: string;
  assignee: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const columnsRef = useRef(columns);
  const dragOriginRef = useRef<BoardColumn[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksById = useMemo(
    () =>
      new Map(
        columns.flatMap((column) =>
          column.tasks.map((task) => [task.id, task] as const),
        ),
      ),
    [columns],
  );

  function handleDragStart(event: DragStartEvent) {
    dragOriginRef.current = columnsRef.current;
    setActiveTask(tasksById.get(String(event.active.id)) ?? null);
  }

  function handleDragCancel() {
    if (dragOriginRef.current) {
      columnsRef.current = dragOriginRef.current;
      setColumns(dragOriginRef.current);
    }
    dragOriginRef.current = null;
    setActiveTask(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    setColumns((current) => {
      const fromColumnId = findColumnId(current, activeId);
      const toColumnId = findColumnId(current, overId);

      if (!fromColumnId || !toColumnId || fromColumnId === toColumnId) {
        return current;
      }

      const next = moveBetweenColumns(current, activeId, overId);
      columnsRef.current = next;
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      handleDragCancel();
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const current = columnsRef.current;
    const origin = dragOriginRef.current ?? current;
    const originColumnId = findColumnId(origin, activeId);
    const liveColumnId = findColumnId(current, activeId);
    const overColumnId = findColumnId(current, overId);

    dragOriginRef.current = null;

    if (!originColumnId || !liveColumnId || !overColumnId) {
      return;
    }

    const next =
      originColumnId === overColumnId
        ? reorderInColumn(current, activeId, overId)
        : liveColumnId === overColumnId
          ? current
          : moveBetweenColumns(current, activeId, overId);

    setColumns(next);
    columnsRef.current = next;

    const before = placementOf(origin, activeId);
    const after = placementOf(next, activeId);

    if (
      !after ||
      (before?.columnId === after.columnId && before.index === after.index)
    ) {
      return;
    }

    persistMove(boardId, next, activeId);
  }

  function openTask(taskId: string) {
    router.replace(boardPath(boardId, { q, assignee, taskId }));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-[28rem] flex-1 gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            boardId={boardId}
            onOpenTask={openTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rotate-1">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
