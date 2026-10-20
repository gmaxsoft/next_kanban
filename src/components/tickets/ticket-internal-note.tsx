"use client";

import { useActionState, useEffect, useState } from "react";

import {
  editTicketInternalNote,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  renderCommentWithMentions,
  type MentionMember,
} from "@/lib/mentions";

export function TicketInternalNote({
  messageId,
  bodyText,
  canEdit,
  members,
}: {
  messageId: string;
  bodyText: string;
  canEdit: boolean;
  members: MentionMember[];
}) {
  const [state, formAction, pending] = useActionState<
    TicketActionState,
    FormData
  >(editTicketInternalNote, null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(bodyText);

  useActionToast(state);

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  function renderedBody() {
    return renderCommentWithMentions(bodyText || "(brak tresci)", members).map(
      (part, index) =>
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
    );
  }

  if (!editing) {
    return (
      <div>
        <p className="whitespace-pre-wrap text-sm leading-6">{renderedBody()}</p>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-xs"
            onClick={() => {
              setBody(bodyText);
              setEditing(true);
            }}
          >
            Edytuj notatke
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="messageId" value={messageId} />
      <Textarea
        name="body"
        value={body}
        required
        maxLength={10000}
        rows={4}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setBody(bodyText);
            setEditing(false);
          }}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}
