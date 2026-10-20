"use client";

import { useActionState, useRef } from "react";
import type { Priority } from "@prisma/client";

import {
  updateTicketPriority,
  type TicketActionState,
} from "@/app/actions/tickets";
import { useActionToast } from "@/hooks/use-action-toast";

const selectClassName =
  "h-8 min-w-28 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function TicketPrioritySelect({
  ticketId,
  priority,
}: {
  ticketId: string;
  priority: Priority;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketPriority, null);
  useActionToast(state);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <select
        name="priority"
        defaultValue={priority}
        key={`${ticketId}-${priority}`}
        disabled={pending}
        aria-label="Priorytet ticketu"
        className={selectClassName}
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="HIGH">Wysoki</option>
        <option value="MEDIUM">Średni</option>
        <option value="LOW">Niski</option>
      </select>
    </form>
  );
}
