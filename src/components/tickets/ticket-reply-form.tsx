"use client";

import { useActionState, useEffect, useState } from "react";

import {
  addTicketInternalNote,
  replyToTicket,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useActionToast } from "@/hooks/use-action-toast";

export type TicketMentionMember = { id: string; name: string };

export function TicketReplyForm({
  ticketId,
  members,
}: {
  ticketId: string;
  members: TicketMentionMember[];
}) {
  const [replyState, replyAction, replyPending] = useActionState<
    TicketActionState,
    FormData
  >(replyToTicket, null);
  const [noteState, noteAction, notePending] = useActionState<
    TicketActionState,
    FormData
  >(addTicketInternalNote, null);
  const [replyEditorKey, setReplyEditorKey] = useState(0);
  const [noteEditorKey, setNoteEditorKey] = useState(0);

  useActionToast(replyState);
  useActionToast(noteState);

  useEffect(() => {
    if (replyState?.success) {
      setReplyEditorKey((key) => key + 1);
    }
  }, [replyState]);

  useEffect(() => {
    if (noteState?.success) {
      setNoteEditorKey((key) => key + 1);
    }
  }, [noteState]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={replyAction} className="grid gap-3 rounded-xl border p-4">
        <input type="hidden" name="ticketId" value={ticketId} />
        <div>
          <h3 className="text-sm font-semibold">Odpowiedź do klienta</h3>
          <p className="text-xs text-muted-foreground">
            Wyśle e-mail z tematem zawierającym numer ticketu, np. [T-101].
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reply-body">Treść</Label>
          <RichTextEditor
            key={replyEditorKey}
            id="reply-body"
            name="body"
            members={members}
            placeholder="Dziękujemy za zgłoszenie..."
            minHeightClassName="min-h-40"
          />
        </div>
        <Button type="submit" disabled={replyPending} className="w-fit">
          {replyPending ? "Wysyłanie..." : "Wyślij e-mail"}
        </Button>
      </form>

      <form action={noteAction} className="grid gap-3 rounded-xl border p-4">
        <input type="hidden" name="ticketId" value={ticketId} />
        <div>
          <h3 className="text-sm font-semibold">Notatka wewnętrzna</h3>
          <p className="text-xs text-muted-foreground">
            Widoczna tylko w panelu — bez wysyłki do klienta. Możesz wkleić
            zdjęcie (Ctrl+V) lub dodać je z paska. Użyj @, aby oznaczyć osobę.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="note-body">Treść</Label>
          <RichTextEditor
            key={noteEditorKey}
            id="note-body"
            name="body"
            enableImages
            members={members}
            placeholder="Notatka dla zespołu… wklej zdjęcie lub napisz @Imię"
            minHeightClassName="min-h-40"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={notePending}
          className="w-fit"
        >
          {notePending ? "Zapisywanie..." : "Dodaj notatkę"}
        </Button>
      </form>
    </div>
  );
}
