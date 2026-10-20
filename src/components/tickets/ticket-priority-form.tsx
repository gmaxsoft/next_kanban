"use client";

import { useActionState } from "react";
import type { Priority } from "@prisma/client";

import {
  updateTicketPriority,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

export function TicketPriorityForm({
  ticketId,
  priority,
}: {
  ticketId: string;
  priority: Priority;
}) {
  const [state, formAction, pending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketPriority, null);
  useActionToast(state);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-2">
        <Label htmlFor="ticket-priority">Priorytet</Label>
        <select
          id="ticket-priority"
          name="priority"
          defaultValue={priority}
          className="h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="HIGH">Wysoki</option>
          <option value="MEDIUM">Średni</option>
          <option value="LOW">Niski</option>
        </select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Zapisywanie..." : "Zmień priorytet"}
      </Button>
    </form>
  );
}
