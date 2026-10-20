"use client";

import { useActionState } from "react";

import {
  updateTicketAssignee,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

export type TicketAssigneeOption = {
  id: string;
  name: string;
};

export function TicketAssigneeForm({
  ticketId,
  assigneeId,
  watcherIds,
  requestedBy,
  members,
}: {
  ticketId: string;
  assigneeId: string | null;
  watcherIds: string[];
  requestedBy: string;
  members: TicketAssigneeOption[];
}) {
  const [state, formAction, pending] = useActionState<TicketActionState, FormData>(
    updateTicketAssignee,
    null,
  );
  useActionToast(state);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-2 sm:max-w-md">
        <Label htmlFor="ticket-requested-by">Od kogo</Label>
        <input
          id="ticket-requested-by"
          name="requestedBy"
          maxLength={255}
          defaultValue={requestedBy}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-2">
        <Label htmlFor="ticket-assignee">A osoba odpowiedzialna</Label>
        <select
          id="ticket-assignee"
          name="assigneeId"
          defaultValue={assigneeId ?? ""}
          className="h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Nieprzypisany</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="grid min-w-60 gap-2">
        <legend className="text-sm font-medium">Obserwujący</legend>
        <div className="grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2">
          {members.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="watcherIds"
                value={member.id}
                defaultChecked={watcherIds.includes(member.id)}
                className="size-4 accent-primary"
              />
              <span>{member.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Zapisywanie..." : "Przypisz"}
      </Button>
      </div>
    </form>
  );
}
