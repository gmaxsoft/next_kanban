"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { TicketStatus } from "@prisma/client";

import {
  updateTicketStatus,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  TICKET_STATUSES,
  ticketStatusLabel,
} from "@/lib/ticket-status";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 min-w-44 rounded-lg border border-border bg-muted/40 px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/40";

export function TicketStatusForm({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [value, setValue] = useState(status);
  const [state, formAction, actionPending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketStatus, null);
  const [isPending, startTransition] = useTransition();
  useActionToast(state);

  const pending = actionPending || isPending;

  useEffect(() => {
    setValue(status);
  }, [status]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="ticket-status">Status</Label>
      <select
        id="ticket-status"
        value={value}
        disabled={pending}
        className={cn(selectClassName, pending && "opacity-60")}
        onChange={(event) => {
          const next = event.target.value as TicketStatus;
          setValue(next);
          const fd = new FormData();
          fd.set("ticketId", ticketId);
          fd.set("status", next);
          startTransition(() => {
            formAction(fd);
          });
        }}
      >
        {TICKET_STATUSES.map((item) => (
          <option key={item} value={item}>
            {ticketStatusLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}
