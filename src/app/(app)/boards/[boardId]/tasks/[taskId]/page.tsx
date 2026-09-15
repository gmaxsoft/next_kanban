import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TaskDetailsForm } from "@/components/kanban/task-details-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-utils";
import { getBoardWithColumns, getTaskDetails, listBoardMembers } from "@/lib/boards";
import { formatTaskCreatedAt } from "@/lib/task-format";

type TaskDetailsPageProps = {
  params: Promise<{ boardId: string; taskId: string }>;
};

export async function generateMetadata({
  params,
}: TaskDetailsPageProps): Promise<Metadata> {
  const { boardId, taskId } = await params;
  const task = await getTaskDetails(boardId, taskId);

  return {
    title: task ? `Szczegóły: ${task.title}` : "Szczegóły zadania",
  };
}

export default async function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const session = await requireAuth();
  const { boardId, taskId } = await params;
  const canManageAssignments = session.user.isAdmin;

  const board = await getBoardWithColumns(boardId);

  if (!board) {
    notFound();
  }

  const [task, members] = await Promise.all([
    getTaskDetails(boardId, taskId),
    listBoardMembers(board.teamId),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit px-0"
          render={<Link href={`/boards/${boardId}`} />}
        >
          <ArrowLeft />
          Wróć do tablicy
        </Button>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Szczegóły zadania
            </h2>
            <Badge variant="outline">{board.team.name}</Badge>
            <Badge variant="secondary">{task.columnTitle}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {board.title} · dodał {task.createdByName}{" "}
            {formatTaskCreatedAt(task.createdAt)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
          <CardDescription>
            Edytuj dane zadania, załogę i opis. W komentarzach możesz oznaczać
            osoby przez @.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskDetailsForm
            boardId={boardId}
            task={task}
            members={members}
            canManageAssignments={canManageAssignments}
            titleIdPrefix="page-task"
          />
        </CardContent>
      </Card>
    </div>
  );
}
