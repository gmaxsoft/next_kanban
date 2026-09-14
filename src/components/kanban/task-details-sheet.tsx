"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { updateTask, type TaskActionState } from "@/app/actions/tasks";
import { TaskComments } from "@/components/kanban/task-comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionToast } from "@/hooks/use-action-toast";
import type { BoardMember, TaskDetails } from "@/lib/kanban";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TaskDetailsBody({
  boardId,
  task,
  members,
  canManageAssignments,
}: {
  boardId: string;
  task: TaskDetails;
  members: BoardMember[];
  canManageAssignments: boolean;
}) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    updateTask,
    null,
  );
  useActionToast(state);

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Szczegóły zadania</SheetTitle>
        <SheetDescription>
          Kolumna {task.columnTitle} · dodał {task.createdByName}{" "}
          {formatCreatedAt(task.createdAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-6 p-4">
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="taskId" value={task.id} />

          <div className="grid gap-2">
            <Label htmlFor="task-title">Tytuł</Label>
            <Input
              id="task-title"
              name="title"
              required
              maxLength={120}
              defaultValue={task.title}
              key={`${task.id}-title-${task.updatedAt}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-priority">Priorytet</Label>
              <select
                id="task-priority"
                name="priority"
                defaultValue={task.priority}
                className={selectClassName}
                key={`${task.id}-priority-${task.updatedAt}`}
              >
                <option value="LOW">Niski</option>
                <option value="MEDIUM">Średni</option>
                <option value="HIGH">Wysoki</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due">Termin wykonania</Label>
              {canManageAssignments ? (
                <Input
                  id="task-due"
                  name="dueDate"
                  type="date"
                  defaultValue={task.dueDate ?? ""}
                  key={`${task.id}-due-${task.updatedAt}`}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("pl-PL", {
                        dateStyle: "medium",
                      })
                    : "Brak terminu"}
                </p>
              )}
            </div>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Przypisana załoga</legend>
            {canManageAssignments ? (
              <div
                className="grid max-h-40 gap-2 overflow-y-auto border border-border p-3"
                key={`${task.id}-assignees-${task.updatedAt}`}
              >
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="assigneeIds"
                      value={member.id}
                      defaultChecked={task.assigneeIds.includes(member.id)}
                      className="size-4 accent-primary"
                    />
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {task.assignees.length > 0
                  ? task.assignees.map((assignee) => assignee.name).join(", ")
                  : "Nieprzypisane"}
              </p>
            )}
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Opis</Label>
            <RichTextEditor
              id="task-description"
              name="description"
              defaultValue={task.description}
              key={`${task.id}-description-${task.updatedAt}`}
              placeholder="Opisz zadanie — listy, nagłówki, linki..."
              minHeightClassName="min-h-40"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </form>

        <Separator />

        <TaskComments
          key={`${task.id}-${task.comments.at(-1)?.id ?? "empty"}`}
          boardId={boardId}
          taskId={task.id}
          comments={task.comments}
        />
      </div>
    </>
  );
}

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
          <TaskDetailsBody
            key={task.id}
            boardId={boardId}
            task={task}
            members={members}
            canManageAssignments={canManageAssignments}
          />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
