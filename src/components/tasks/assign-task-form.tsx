"use client";

import { useActionState, useMemo, useState } from "react";
import { ListTodo } from "lucide-react";

import { assignTask, type TaskActionState } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useActionToast } from "@/hooks/use-action-toast";
import type {
  AssignBoardOption,
  AssignMemberOption,
  AssignTeamOption,
} from "@/lib/kanban";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function AssignTaskForm({
  teams,
  boards,
  members,
}: {
  teams: AssignTeamOption[];
  boards: AssignBoardOption[];
  members: AssignMemberOption[];
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const teamBoards = useMemo(
    () => boards.filter((board) => board.teamId === teamId),
    [boards, teamId],
  );
  const [boardId, setBoardId] = useState(teamBoards[0]?.id ?? "");
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    assignTask,
    null,
  );
  useActionToast(state);

  const activeBoardId = teamBoards.some((board) => board.id === boardId)
    ? boardId
    : (teamBoards[0]?.id ?? "");

  const columns = useMemo(
    () =>
      teamBoards.find((board) => board.id === activeBoardId)?.columns ?? [],
    [teamBoards, activeBoardId],
  );

  const teamMembers = useMemo(
    () => members.filter((member) => member.teamId === teamId),
    [members, teamId],
  );

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Najpierw utwórz zespół w ustawieniach, żeby móc przydzielać zadania.
      </p>
    );
  }

  if (boards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Najpierw utwórz tablicę z kolumnami statusów, żeby móc przydzielać zadania.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="assign-title">Tytuł zadania</Label>
        <Input
          id="assign-title"
          name="title"
          required
          maxLength={120}
          placeholder="Np. Przygotować raport miesięczny"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="assign-description">Opis (opcjonalnie)</Label>
        <RichTextEditor
          id="assign-description"
          name="description"
          placeholder="Szczegóły dla załogi — formatowanie, listy, linki..."
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="assign-team">Zespół</Label>
        <select
          id="assign-team"
          name="teamId"
          className={selectClassName}
          value={teamId}
          onChange={(event) => {
            const nextTeamId = event.target.value;
            setTeamId(nextTeamId);
            const nextBoards = boards.filter(
              (board) => board.teamId === nextTeamId,
            );
            setBoardId(nextBoards[0]?.id ?? "");
          }}
          required
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="assign-board">Tablica</Label>
          <select
            id="assign-board"
            name="boardId"
            className={selectClassName}
            value={activeBoardId}
            onChange={(event) => setBoardId(event.target.value)}
            required
            disabled={teamBoards.length === 0}
          >
            {teamBoards.length === 0 ? (
              <option value="">Brak tablic w zespole</option>
            ) : (
              teamBoards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.title}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="assign-column">Status</Label>
          <select
            id="assign-column"
            name="columnId"
            className={selectClassName}
            required
            key={activeBoardId}
            defaultValue={columns[0]?.id}
            disabled={columns.length === 0}
          >
            {columns.length === 0 ? (
              <option value="">Brak kolumn</option>
            ) : (
              columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="assign-priority">Priorytet</Label>
          <select
            id="assign-priority"
            name="priority"
            defaultValue="MEDIUM"
            className={selectClassName}
          >
            <option value="LOW">Niski</option>
            <option value="MEDIUM">Średni</option>
            <option value="HIGH">Wysoki</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="assign-due">Termin wykonania</Label>
          <Input id="assign-due" name="dueDate" type="date" required />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <LegendLabel>Przypisz do załogi</LegendLabel>
        {!teamId ? (
          <p className="text-sm text-muted-foreground">
            Najpierw wybierz zespół, aby zobaczyć osoby.
          </p>
        ) : teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            W wybranym zespole nie ma aktywnych osób.
          </p>
        ) : (
          <div className="grid max-h-48 gap-2 overflow-y-auto border border-border p-3">
            {teamMembers.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={member.id}
                  className="size-4 accent-primary"
                />
                <span>{member.name}</span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Lista załogi pojawia się po wyborze zespołu. Możesz wybrać jedną lub
          wiele osób.
        </p>
      </fieldset>

      <Button
        type="submit"
        disabled={pending || teamBoards.length === 0 || teamMembers.length === 0}
        className="w-fit"
      >
        <ListTodo />
        {pending ? "Przydzielanie..." : "Przydziel zadanie"}
      </Button>
    </form>
  );
}

function LegendLabel({ children }: { children: string }) {
  return (
    <legend className="mb-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </legend>
  );
}
