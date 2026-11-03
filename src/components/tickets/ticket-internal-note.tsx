"use client";

import { useActionState, useEffect, useState } from "react";

import {
  deleteTicketInternalNote,
  editTicketInternalNote,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useActionToast } from "@/hooks/use-action-toast";
import type { MentionMember } from "@/lib/mentions";

export function TicketInternalNote({
  messageId,
  bodyText,
  bodyHtml,
  canEdit,
  members,
}: {
  messageId: string;
  bodyText: string;
  bodyHtml?: string | null;
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

  const displayValue = bodyHtml?.trim() ? bodyHtml : bodyText;

  if (!editing) {
    return (
      <div>
        {displayValue ? (
          <RichTextContent
            value={displayValue}
            allowImages
            className="leading-6"
          />
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            (brak treści)
          </p>
        )}
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
      <RichTextEditor
        name="body"
        enableImages
        members={members}
        defaultValue={displayValue}
        placeholder="Notatka dla zespołu… wklej zdjęcie lub napisz @Imię"
        minHeightClassName="min-h-32"
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
