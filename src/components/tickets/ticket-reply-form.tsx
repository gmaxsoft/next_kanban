"use client";

import { useActionState } from "react";

import {
  addTicketInternalNote,
  replyToTicket,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [replyState, replyAction, replyPending] = useActionState<
    TicketActionState,
    FormData
  >(replyToTicket, null);
  const [noteState, noteAction, notePending] = useActionState<
    TicketActionState,
    FormData
  >(addTicketInternalNote, null);

  useActionToast(replyState);
  useActionToast(noteState);

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
          <Textarea
            id="reply-body"
            name="body"
            required
            rows={5}
            placeholder="Dziękujemy za zgłoszenie..."
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
            Widoczna tylko w panelu — bez wysyłki do klienta.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="note-body">Treść</Label>
          <Textarea
            id="note-body"
            name="body"
            required
            rows={5}
            placeholder="Notatka dla zespołu..."
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
