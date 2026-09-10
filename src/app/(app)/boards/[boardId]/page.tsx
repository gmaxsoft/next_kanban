import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BoardFilters } from "@/components/kanban/board-filters";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailsSheet } from "@/components/kanban/task-details-sheet";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-utils";
import { boardPath, parseBoardSearch } from "@/lib/board-query";
import {
  getBoardWithColumns,
  getTaskDetails,
  listBoardMembers,
  mapBoardColumns,
} from "@/lib/boards";

type BoardPageProps = {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{
    q?: string | string[];
    assignee?: string | string[];
    task?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const { boardId } = await params;
  const board = await getBoardWithColumns(boardId);

  return {
    title: board?.title ?? "Tablica",
  };
}

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  await requireAuth();
  const { boardId } = await params;
  const { q, assignee, taskId } = parseBoardSearch(await searchParams);

  const [board, members, selectedTask] = await Promise.all([
    getBoardWithColumns(boardId, { q, assignee }),
    listBoardMembers(),
    taskId ? getTaskDetails(boardId, taskId) : Promise.resolve(null),
  ]);

  if (!board) {
    notFound();
  }

  const columns = mapBoardColumns(board);
  const boardKey = [
    q,
    assignee,
    ...columns.flatMap((column) => column.tasks.map((task) => task.id)),
  ]
    .sort()
    .join(",");

  return (
    <div className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit px-0"
            render={<Link href="/boards" />}
          >
            <ArrowLeft />
            Wszystkie tablice
          </Button>
          <h2 className="text-2xl font-semibold">{board.title}</h2>
          <p className="text-sm text-muted-foreground">
            Kliknij kartę, aby otworzyć szczegóły. Przeciągnij, żeby zmienić kolumnę
            albo kolejność.
          </p>
        </div>
      </div>

      <BoardFilters
        boardId={board.id}
        q={q}
        assignee={assignee}
        taskId={taskId}
        members={members}
      />

      {(q || assignee) && columns.every((column) => column.tasks.length === 0) ? (
        <p className="text-sm text-muted-foreground">
          Brak zadań pasujących do filtrów.
        </p>
      ) : null}

      <KanbanBoard
        key={boardKey}
        boardId={board.id}
        columns={columns}
        q={q}
        assignee={assignee}
      />

      <TaskDetailsSheet
        boardId={board.id}
        task={selectedTask}
        members={members}
        closeHref={boardPath(board.id, { q, assignee })}
      />
    </div>
  );
}
