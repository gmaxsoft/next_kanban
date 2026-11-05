"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";

import { moveTask } from "@/app/actions/boards";
import { AddTaskForm } from "@/components/kanban/add-task-form";
import { KanbanColumn } from "@/components/kanban/board-column";
import { TaskCard } from "@/components/kanban/task-card";
import { TaskContextMenu } from "@/components/kanban/task-context-menu";
import type { BoardView } from "@/lib/board-query";
import { taskPath } from "@/lib/board-query";
import type { BoardColumn, BoardTask } from "@/lib/kanban";
import { canUserMoveTask } from "@/lib/task-access";

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

async function persistMove(
  boardId: string,
  columns: BoardColumn[],
  taskId: string,
  onDenied: () => void,
) {
  const placement = placementOf(columns, taskId);

  if (!placement) {
    return;
  }

  const result = await moveTask({
    boardId,
    taskId,
    toColumnId: placement.columnId,
    toIndex: placement.index,
  });

  if (result.error) {
    toast.error(result.error);
    onDenied();
  }
}

export function KanbanBoard({
  boardId,
  columns: initialColumns,
  q,
  assignee,
  view,
  currentUserId,
  isAdmin,
  canCreateTasks,
  canDeleteTasks = false,
}: {
  boardId: string;
  columns: BoardColumn[];
  q: string;
  assignee: string;
  view: BoardView;
  currentUserId: string;
  isAdmin: boolean;
  canCreateTasks: boolean;
  canDeleteTasks?: boolean;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [dndReady, setDndReady] = useState(false);
  const columnsRef = useRef(columns);
  const dragOriginRef = useRef<BoardColumn[] | null>(null);

  useEffect(() => {
    setDndReady(true);
  }, []);

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

  function canDragTask(taskId: string) {
    const task = tasksById.get(taskId);
    if (!task) {
      return false;
    }

    return canUserMoveTask(
      { id: currentUserId, isAdmin },
      task.assignees.map((row) => row.id),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = String(event.active.id);
    if (!canDragTask(taskId)) {
      return;
    }

    dragOriginRef.current = columnsRef.current;
    setActiveTask(tasksById.get(taskId) ?? null);
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
    if (!canDragTask(activeId)) {
      return;
    }

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

    const activeId = String(active.id);
    if (!canDragTask(activeId)) {
      handleDragCancel();
      return;
    }

    if (!over) {
      handleDragCancel();
      return;
    }

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

    void persistMove(boardId, next, activeId, () => {
      columnsRef.current = origin;
      setColumns(origin);
      router.refresh();
    });
  }

  function openTask(taskId: string) {
    router.push(taskPath(boardId, taskId));
  }

  // @dnd-kit uses module-level ID counters that diverge between SSR and client.
  // Render a static board until mount, then enable DnD with a stable context id.
  if (!dndReady) {
    return (
      <div
        className="flex min-h-0 w-full flex-1 flex-col"
        aria-busy="true"
      >
        <div className="flex min-h-[28rem] w-full flex-1 gap-4 overflow-x-auto pb-2">
          {columns.map((column) => (
            <section
              key={column.id}
              className="flex min-h-[28rem] min-w-72 flex-1 basis-0 flex-col bg-muted/50 p-3"
            >
              <header className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-semibold tracking-tight">
                  {column.title}
                </h3>
                <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                  {column.tasks.length}
                </span>
              </header>
              <div className="flex min-h-28 flex-1 flex-col gap-2 overflow-y-auto">
                {column.tasks.map((task) => (
                  <TaskContextMenu
                    key={task.id}
                    boardId={boardId}
                    taskId={task.id}
                    taskTitle={task.title}
                    canDelete={canDeleteTasks}
                  >
                    {({ onContextMenu }) => (
                      <button
                        type="button"
                        className="cursor-pointer text-left"
                        aria-label={`Otwórz zadanie ${task.title}`}
                        onClick={() => openTask(task.id)}
                        onContextMenu={onContextMenu}
                      >
                        <TaskCard task={task} />
                      </button>
                    )}
                  </TaskContextMenu>
                ))}
              </div>
              {canCreateTasks ? (
                <AddTaskForm boardId={boardId} columnId={column.id} />
              ) : null}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <DndContext
        id={`kanban-${boardId}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-[28rem] w-full flex-1 gap-4 overflow-x-auto pb-2">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              boardId={boardId}
              canCreateTasks={canCreateTasks}
              canDeleteTasks={canDeleteTasks}
              canDragTask={canDragTask}
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
    </div>
  );
}
