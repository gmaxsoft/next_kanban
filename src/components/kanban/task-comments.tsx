"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { addComment, type TaskActionState } from "@/app/actions/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import type { BoardMember, TaskComment } from "@/lib/kanban";
import { renderCommentWithMentions } from "@/lib/mentions";
import { getInitials } from "@/lib/user";

function formatCommentDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function CommentBody({ content }: { content: string }) {
  const parts = renderCommentWithMentions(content);

  return (
    <p className="mt-1 whitespace-pre-wrap text-sm leading-5">
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <span
            key={`${part.value}-${index}`}
            className="rounded bg-primary/10 px-0.5 font-medium text-primary"
          >
            {part.value}
          </span>
        ) : (
          <span key={`${index}-${part.value.slice(0, 8)}`}>{part.value}</span>
        ),
      )}
    </p>
  );
}

export function TaskComments({
  boardId,
  taskId,
  comments,
  members,
}: {
  boardId: string;
  taskId: string;
  comments: TaskComment[];
  members: BoardMember[];
}) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    addComment,
    null,
  );
  useActionToast(state);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (state?.success) {
      setContent("");
      setMentionedIds([]);
      setMentionQuery(null);
    }
  }, [state?.success]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }

    const query = mentionQuery.toLowerCase();
    return members
      .filter((member) => member.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [members, mentionQuery]);

  function syncMentionState(value: string, caret: number) {
    const before = value.slice(0, caret);
    const match = before.match(/(^|[\s([{"'])@([^\s@]*)$/);

    if (!match) {
      setMentionQuery(null);
      return;
    }

    setMentionQuery(match[2] ?? "");
    setActiveIndex(0);
  }

  function insertMention(member: BoardMember) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const caret = textarea.selectionStart ?? content.length;
    const before = content.slice(0, caret);
    const after = content.slice(caret);
    const match = before.match(/(^|[\s([{"'])@([^\s@]*)$/);

    if (!match) {
      return;
    }

    const start = before.length - (match[2]?.length ?? 0) - 1;
    const prefix = before.slice(0, start);
    const next = `${prefix}@${member.name} ${after}`;
    const nextCaret = `${prefix}@${member.name} `.length;

    setContent(next);
    setMentionedIds((current) =>
      current.includes(member.id) ? current : [...current, member.id],
    );
    setMentionQuery(null);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">Komentarze</h3>
      <p className="text-xs text-muted-foreground">
        Użyj @, aby oznaczyć osobę z zespołu — dostanie powiadomienie e-mail.
      </p>

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
                  <span className="text-sm font-medium">
                    {comment.author.name}
                  </span>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={comment.createdAt}
                  >
                    {formatCommentDate(comment.createdAt)}
                  </time>
                </div>
                <CommentBody content={comment.content} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="relative grid gap-2">
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="taskId" value={taskId} />
        {mentionedIds.map((id) => (
          <input key={id} type="hidden" name="mentionedIds" value={id} />
        ))}
        <Textarea
          ref={textareaRef}
          name="content"
          required
          maxLength={2000}
          rows={3}
          value={content}
          placeholder="Napisz komentarz… użyj @ aby wspomnieć osobę"
          onChange={(event) => {
            const value = event.target.value;
            setContent(value);
            syncMentionState(value, event.target.selectionStart ?? value.length);
          }}
          onKeyDown={(event) => {
            if (mentionQuery === null || suggestions.length === 0) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % suggestions.length);
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex(
                (index) => (index - 1 + suggestions.length) % suggestions.length,
              );
              return;
            }

            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              insertMention(suggestions[activeIndex] ?? suggestions[0]);
              return;
            }

            if (event.key === "Escape") {
              setMentionQuery(null);
            }
          }}
          onClick={(event) => {
            const target = event.currentTarget;
            syncMentionState(
              target.value,
              target.selectionStart ?? target.value.length,
            );
          }}
          onKeyUp={(event) => {
            const target = event.currentTarget;
            syncMentionState(
              target.value,
              target.selectionStart ?? target.value.length,
            );
          }}
        />

        {mentionQuery !== null && suggestions.length > 0 ? (
          <ul className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md sm:max-w-sm">
            {suggestions.map((member, index) => (
              <li key={member.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    index === activeIndex ? "bg-muted" : "hover:bg-muted/70"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(member);
                  }}
                >
                  <Avatar size="sm" className="size-6">
                    <AvatarImage
                      src={member.avatarUrl ?? undefined}
                      alt={member.name}
                    />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <Button type="submit" size="sm" disabled={pending} className="w-fit">
          {pending ? "Dodawanie..." : "Dodaj komentarz"}
        </Button>
      </form>
    </section>
  );
}
