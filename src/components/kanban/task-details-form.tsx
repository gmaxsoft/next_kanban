"use client";

import { useActionState } from "react";

import { updateTask, type TaskActionState } from "@/app/actions/tasks";
import { TaskComments } from "@/components/kanban/task-comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Separator } from "@/components/ui/separator";
import { useActionToast } from "@/hooks/use-action-toast";
import type { BoardMember, TaskDetails } from "@/lib/kanban";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function TaskDetailsForm({
  boardId,
  task,
  members,
  canManageAssignments,
  titleIdPrefix = "task",
}: {
  boardId: string;
  task: TaskDetails;
  members: BoardMember[];
  canManageAssignments: boolean;
  titleIdPrefix?: string;
}) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    updateTask,
    null,
  );
  useActionToast(state);

  return (
    <div className="grid gap-6">
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="taskId" value={task.id} />

        <div className="grid gap-2">
          <Label htmlFor={`${titleIdPrefix}-title`}>Tytuł</Label>
          <Input
            id={`${titleIdPrefix}-title`}
            name="title"
            required
            maxLength={120}
            defaultValue={task.title}
            key={`${task.id}-title-${task.updatedAt}`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${titleIdPrefix}-priority`}>Priorytet</Label>
            <select
              id={`${titleIdPrefix}-priority`}
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
            <Label htmlFor={`${titleIdPrefix}-due`}>Termin wykonania</Label>
            {canManageAssignments ? (
              <Input
                id={`${titleIdPrefix}-due`}
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
          <Label htmlFor={`${titleIdPrefix}-description`}>Opis</Label>
          <RichTextEditor
            id={`${titleIdPrefix}-description`}
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
        members={members}
      />
    </div>
  );
}
