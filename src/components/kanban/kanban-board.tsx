import { BoardColumn } from "@/components/kanban/board-column";
import type { BoardColumn as BoardColumnData } from "@/lib/kanban";

export function KanbanBoard({ columns }: { columns: BoardColumnData[] }) {
  return (
    <div className="flex min-h-[28rem] flex-1 gap-4 overflow-x-auto pb-2">
      {columns.map((column) => (
        <BoardColumn key={column.id} column={column} />
      ))}
    </div>
  );
}
