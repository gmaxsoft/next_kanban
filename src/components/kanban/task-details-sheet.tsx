"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { TaskDetailsForm } from "@/components/kanban/task-details-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BoardMember, TaskDetails } from "@/lib/kanban";
import { formatTaskCreatedAt } from "@/lib/task-format";

export function TaskDetailsSheet({
  boardId,
  task,
  members,
  canManageAssignments,
  closeHref,
}: {
  boardId: string;
  task: TaskDetails | null;
  members: BoardMember[];
  canManageAssignments: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const [wantsClosed, setWantsClosed] = useState(false);
  const [seenTaskId, setSeenTaskId] = useState(task?.id ?? null);
  const taskId = task?.id ?? null;

  if (taskId !== seenTaskId) {
    setSeenTaskId(taskId);
    setWantsClosed(false);
  }

  return (
    <Sheet
      open={Boolean(task) && !wantsClosed}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setWantsClosed(true);
          router.replace(closeHref);
        }
      }}
    >
      {task ? (
        <SheetContent
          showCloseButton
          className="w-full gap-0 overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Szczegóły zadania</SheetTitle>
            <SheetDescription>
              Kolumna {task.columnTitle} · dodał {task.createdByName}{" "}
              {formatTaskCreatedAt(task.createdAt)}
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <TaskDetailsForm
              key={task.id}
              boardId={boardId}
              task={task}
              members={members}
              canManageAssignments={canManageAssignments}
              titleIdPrefix="sheet-task"
            />
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
