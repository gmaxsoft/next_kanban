"use client";

import { useActionState } from "react";

import { addComment, type TaskActionState } from "@/app/actions/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import type { TaskComment } from "@/lib/kanban";
import { getInitials } from "@/lib/user";

function formatCommentDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function TaskComments({
  boardId,
  taskId,
  comments,
}: {
  boardId: string;
  taskId: string;
  comments: TaskComment[];
}) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    addComment,
    null,
  );
  useActionToast(state);

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">Komentarze</h3>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Brak komentarzy. Dodaj pierwszą notatkę pod zadaniem.
        </p>
      ) : (
        <ul className="grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <Avatar size="sm" className="mt-0.5 size-7">
                <AvatarImage
                  src={comment.author.avatarUrl ?? undefined}
                  alt={comment.author.name}
                />
                <AvatarFallback className="text-[10px]">
                  {getInitials(comment.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-lg border bg-muted/40 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={comment.createdAt}
                  >
                    {formatCommentDate(comment.createdAt)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="grid gap-2">
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="taskId" value={taskId} />
        <Textarea
          name="content"
          required
          maxLength={2000}
          rows={3}
          placeholder="Napisz komentarz..."
        />
        <Button type="submit" size="sm" disabled={pending} className="w-fit">
          {pending ? "Dodawanie..." : "Dodaj komentarz"}
        </Button>
      </form>
    </section>
  );
}
