"use client";

import { useActionState } from "react";
import type { TicketStatus } from "@prisma/client";

import {
  updateTicketStatus,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

export function TicketStatusForm({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [state, formAction, pending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketStatus, null);
  useActionToast(state);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-2">
        <Label htmlFor="ticket-status">Status</Label>
        <select
          id="ticket-status"
          name="status"
          defaultValue={status}
          className="h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Zapisywanie..." : "Zmień status"}
      </Button>
    </form>
  );
}
