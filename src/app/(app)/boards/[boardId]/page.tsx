import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-utils";
import { getBoardWithColumns, mapBoardColumns } from "@/lib/boards";

type BoardPageProps = {
  params: Promise<{ boardId: string }>;
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

export default async function BoardPage({ params }: BoardPageProps) {
  await requireAuth();
  const { boardId } = await params;
  const board = await getBoardWithColumns(boardId);

  if (!board) {
    notFound();
  }

  const columns = mapBoardColumns(board);
  const boardKey = columns
    .flatMap((column) => column.tasks.map((task) => task.id))
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
            Przeciągaj karty między kolumnami albo zmień ich kolejność. Stan
            zapisuje się automatycznie.
          </p>
        </div>
      </div>

      <KanbanBoard key={boardKey} boardId={board.id} columns={columns} />
    </div>
  );
}
