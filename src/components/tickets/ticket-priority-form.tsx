"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { Priority } from "@prisma/client";

import {
  updateTicketPriority,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function TicketPriorityForm({
  ticketId,
  priority,
}: {
  ticketId: string;
  priority: Priority;
}) {
  const [value, setValue] = useState(priority);
  const [state, formAction, actionPending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketPriority, null);
  const [isPending, startTransition] = useTransition();
  useActionToast(state);

  const pending = actionPending || isPending;

  useEffect(() => {
    setValue(priority);
  }, [priority]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="ticket-priority">Priorytet</Label>
      <select
        id="ticket-priority"
        value={value}
        disabled={pending}
        className={cn(selectClassName, pending && "opacity-60")}
        onChange={(event) => {
          const next = event.target.value as Priority;
          setValue(next);
          const fd = new FormData();
          fd.set("ticketId", ticketId);
          fd.set("priority", next);
          startTransition(() => {
            formAction(fd);
          });
        }}
      >
        <option value="HIGH">Wysoki</option>
        <option value="MEDIUM">Średni</option>
        <option value="LOW">Niski</option>
      </select>
    </div>
  );
}
