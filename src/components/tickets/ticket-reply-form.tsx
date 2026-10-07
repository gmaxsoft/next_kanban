"use client";

import { useActionState, useEffect, useState } from "react";

import {
  addTicketInternalNote,
  replyToTicket,
  type TicketActionState,
} from "@/app/actions/tickets";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import type { BoardMember } from "@/lib/kanban";

export function TicketReplyForm({
  ticketId,
  members,
}: {
  ticketId: string;
  members: BoardMember[];
}) {
  const [replyState, replyAction, replyPending] = useActionState<
    TicketActionState,
    FormData
  >(replyToTicket, null);
  const [noteState, noteAction, notePending] = useActionState<
    TicketActionState,
    FormData
  >(addTicketInternalNote, null);
  const [replyResetKey, setReplyResetKey] = useState(0);
  const [noteResetKey, setNoteResetKey] = useState(0);

  useActionToast(replyState);
  useActionToast(noteState);

  useEffect(() => {
    if (replyState?.success) {
      setReplyResetKey((value) => value + 1);
    }
  }, [replyState]);

  useEffect(() => {
    if (noteState?.success) {
      setNoteResetKey((value) => value + 1);
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
            Użyj @, aby powiadomić osobę z zespołu w aplikacji.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reply-body">Treść</Label>
          <MentionTextarea
            id="reply-body"
            name="body"
            required
            rows={5}
            members={members}
            resetKey={replyResetKey}
            placeholder="Dziękujemy za zgłoszenie… użyj @ aby wspomnieć osobę"
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
            Widoczna tylko w panelu — bez wysyłki do klienta. @imię wysyła
            powiadomienie do oznaczonej osoby.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="note-body">Treść</Label>
          <MentionTextarea
            id="note-body"
            name="body"
            required
            rows={5}
            members={members}
            resetKey={noteResetKey}
            placeholder="Notatka dla zespołu… użyj @ aby wspomnieć osobę"
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
