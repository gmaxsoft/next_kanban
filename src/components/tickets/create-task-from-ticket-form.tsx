"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createTaskFromTicket,
  updateTicketTeam,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

type TeamOption = { id: string; name: string; inboundEmail: string | null };
type BoardOption = { id: string; title: string; teamId: string };

export function CreateTaskFromTicketForm({
  ticketId,
  currentTeamId,
  teams,
  boards,
  hasTask,
}: {
  ticketId: string;
  currentTeamId: string | null;
  teams: TeamOption[];
  boards: BoardOption[];
  hasTask: boolean;
}) {
  const [teamId, setTeamId] = useState(currentTeamId ?? teams[0]?.id ?? "");
  const [createState, createAction, createPending] = useActionState<
    TicketActionState,
    FormData
  >(createTaskFromTicket, null);
  const [teamState, teamAction, teamPending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketTeam, null);

  useActionToast(createState);
  useActionToast(teamState);

  const boardOptions = useMemo(
    () => boards.filter((board) => !teamId || board.teamId === teamId),
    [boards, teamId],
  );

  if (hasTask) {
    return null;
  }

  return (
    <div className="grid gap-4 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold">Zadanie na tablicy Kanban</h3>
        <p className="text-xs text-muted-foreground">
          Pierwszy człon adresu skrzynki często wskazuje zespół — możesz go
          zmienić przed utworzeniem karty w kolumnie „Do zrobienia”.
        </p>
      </div>

      <form action={teamAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <input type="hidden" name="ticketId" value={ticketId} />
        <div className="grid gap-2">
          <Label htmlFor="ticket-team">Zespół</Label>
          <select
            id="ticket-team"
            name="teamId"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">Bez zespołu</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
                {team.inboundEmail ? ` (${team.inboundEmail})` : ""}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary" disabled={teamPending}>
          {teamPending ? "Zapisywanie..." : "Zapisz zespół"}
        </Button>
      </form>

      <form action={createAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="teamId" value={teamId} />
        <div className="grid gap-2">
          <Label htmlFor="ticket-board">Tablica</Label>
          <select
            id="ticket-board"
            name="boardId"
            required
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            disabled={boardOptions.length === 0}
            defaultValue={boardOptions[0]?.id ?? ""}
          >
            {boardOptions.length === 0 ? (
              <option value="">Brak tablic dla zespołu</option>
            ) : (
              boardOptions.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.title}
                </option>
              ))
            )}
          </select>
        </div>
        <Button type="submit" disabled={createPending || boardOptions.length === 0}>
          {createPending ? "Tworzenie..." : "Utwórz zadanie na tablicy Kanban"}
        </Button>
      </form>
    </div>
  );
}
