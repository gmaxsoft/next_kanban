import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BoardFilters } from "@/components/kanban/board-filters";
import { BoardViewTabs } from "@/components/kanban/board-view-tabs";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailsSheet } from "@/components/kanban/task-details-sheet";
import { TaskListView } from "@/components/kanban/task-list-view";
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
    view?: string | string[];
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
  const session = await requireAuth();
  const { boardId } = await params;
  const { q, assignee, taskId, view } = parseBoardSearch(await searchParams);
  const canCreateTasks = session.user.isAdmin;

  const board = await getBoardWithColumns(boardId, { q, assignee });

  if (!board) {
    notFound();
  }

  const [members, selectedTask] = await Promise.all([
    listBoardMembers(board.teamId),
    taskId ? getTaskDetails(boardId, taskId) : Promise.resolve(null),
  ]);

  const columns = mapBoardColumns(board);
  const boardKey = [
    view,
    q,
    assignee,
    ...columns.flatMap((column) => column.tasks.map((task) => task.id)),
  ]
    .sort()
    .join(",");

  const emptyFiltered =
    (q || assignee) && columns.every((column) => column.tasks.length === 0);

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
            Zespół: {board.team.name}.{" "}
            {view === "list"
              ? "Widok listy — kliknij wiersz, aby otworzyć szczegóły zadania."
              : "Widok tablicy — kliknij kartę, przeciągnij między kolumnami."}
            {!canCreateTasks
              ? " Dodawanie zadań jest dostępne tylko dla ADMINISTRATORA."
              : null}
          </p>
        </div>
        <BoardViewTabs
          boardId={board.id}
          view={view}
          q={q}
          assignee={assignee}
          taskId={taskId}
        />
      </div>

      <BoardFilters
        boardId={board.id}
        q={q}
        assignee={assignee}
        taskId={taskId}
        view={view}
        members={members}
      />

      {emptyFiltered ? (
        <p className="text-sm text-muted-foreground">
          Brak zadań pasujących do filtrów.
        </p>
      ) : null}

      {view === "list" ? (
        <TaskListView
          boardId={board.id}
          columns={columns}
          q={q}
          assignee={assignee}
          view={view}
        />
      ) : (
        <KanbanBoard
          key={boardKey}
          boardId={board.id}
          columns={columns}
          q={q}
          assignee={assignee}
          view={view}
          canCreateTasks={canCreateTasks}
        />
      )}

      <TaskDetailsSheet
        boardId={board.id}
        task={selectedTask}
        members={members}
        canManageAssignments={canCreateTasks}
        closeHref={boardPath(board.id, { q, assignee, view })}
      />
    </div>
  );
}
