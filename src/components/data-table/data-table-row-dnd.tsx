"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { flexRender } from "@tanstack/react-table";
import type { LegacyRow } from "@tanstack/react-table/legacy";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RowDndActiveContext = createContext(false);

export function useRowDndActive() {
  return useContext(RowDndActiveContext);
}

function DragHandleButton({
  attributes,
  listeners,
}: {
  attributes?: React.HTMLAttributes<HTMLButtonElement>;
  listeners?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      aria-label="Przeciągnij wiersz"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </Button>
  );
}

function SortableDragHandle({ rowId }: { rowId: string }) {
  const { attributes, listeners } = useSortable({ id: rowId });
  return <DragHandleButton attributes={attributes} listeners={listeners} />;
}

export function RowDragHandleCell({ rowId }: { rowId: string }) {
  const dndActive = useRowDndActive();

  // Avoid calling useSortable during SSR / before DnD mounts (hydration IDs).
  if (!dndActive) {
    return <DragHandleButton />;
  }

  return <SortableDragHandle rowId={rowId} />;
}

export function StaticTableRow<TData extends Record<string, unknown>>({
  row,
  inactive,
}: {
  row: LegacyRow<TData>;
  inactive?: boolean;
}) {
  return (
    <tr
      className="border-b last:border-0 data-[inactive=true]:opacity-60"
      data-inactive={inactive ? "true" : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="py-2 pr-4 last:pr-0">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export function DraggableRow<TData extends Record<string, unknown>>({
  row,
  inactive,
}: {
  row: LegacyRow<TData>;
  inactive?: boolean;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b last:border-0 data-[inactive=true]:opacity-60",
        isDragging && "bg-muted/40 shadow-sm",
      )}
      data-inactive={inactive ? "true" : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="py-2 pr-4 last:pr-0">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export function DataTableRowDndProvider({
  items,
  onDragEnd,
  children,
}: {
  items: UniqueIdentifier[];
  onDragEnd: (event: DragEndEvent) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  return (
    <RowDndActiveContext.Provider value={true}>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </RowDndActiveContext.Provider>
  );
}

/** Mount DnD only after hydration to avoid aria-describedby ID mismatches. */
export function useClientRowDnd(enabled: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (enabled) {
      setReady(true);
    }
  }, [enabled]);

  return enabled && ready;
}

export function reorderRowsById<T extends { id: string }>(
  rows: T[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
): T[] {
  const oldIndex = rows.findIndex((row) => row.id === activeId);
  const newIndex = rows.findIndex((row) => row.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return rows;
  }
  return arrayMove(rows, oldIndex, newIndex);
}
