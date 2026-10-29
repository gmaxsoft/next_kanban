"use client";

import { useActionState, useEffect, useState } from "react";

import {
  deleteTicketInternalNote,
  editTicketInternalNote,
  type TicketActionState,
} from "@/app/actions/tickets";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
  const [deleteState, deleteAction, deletePending] = useActionState<
    TicketActionState,
    FormData
  >(deleteTicketInternalNote, null);
  const [editing, setEditing] = useState(false);

  useActionToast(state);
  useActionToast(deleteState);

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="w-fit"
              onClick={() => setEditing(true)}
            >
              Edytuj notatkę
            </Button>
            <ConfirmDeleteDialog
              title="Usunąć notatkę wewnętrzną?"
              description="Czy na pewno chcesz usunąć tę notatkę wewnętrzną? Tej operacji nie można cofnąć."
              confirmLabel="Usuń"
              triggerLabel="Usuń"
              triggerVariant="default"
              triggerSize="sm"
              pending={deletePending}
              formAction={deleteAction}
              hiddenFields={{ messageId }}
              closeOnSuccess={deleteState}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="messageId" value={messageId} />
      <MentionTextarea
        name="body"
        required
        rows={4}
        members={members}
        defaultValue={bodyText}
        placeholder="Notatka dla zespołu… użyj @, aby oznaczyć osobę"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending} className="w-fit">
          {pending ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          className="w-fit"
          onClick={() => setEditing(false)}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}
