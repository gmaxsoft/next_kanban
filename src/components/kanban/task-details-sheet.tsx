"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { updateTask, type TaskActionState } from "@/app/actions/tasks";
import { TaskComments } from "@/components/kanban/task-comments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
}: {
  boardId: string;
  task: TaskDetails;
  members: BoardMember[];
}) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    updateTask,
    null,
  );

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

          {state?.error ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state?.success ? (
            <Alert>
              <CheckCircle2Icon />
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

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
              <Label htmlFor="task-assignee">Przypisany programista</Label>
              <select
                id="task-assignee"
                name="assigneeId"
                defaultValue={task.assigneeId ?? ""}
                className={selectClassName}
                key={`${task.id}-assignee-${task.updatedAt}`}
              >
                <option value="">Nieprzypisane</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Opis</Label>
            <Textarea
              id="task-description"
              name="description"
              defaultValue={task.description}
              key={`${task.id}-description-${task.updatedAt}`}
              maxLength={10000}
              rows={8}
              placeholder="Opis zadania zwykłym tekstem..."
            />
            <p className="text-xs text-muted-foreground">
              Zwykły tekst — podział linii zostanie zachowany.
            </p>
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
  closeHref,
}: {
  boardId: string;
  task: TaskDetails | null;
  members: BoardMember[];
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
          />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
