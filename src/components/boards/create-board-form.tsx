"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createBoard, type BoardActionState } from "@/app/actions/boards";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import type { AssignTeamOption } from "@/lib/kanban";
import { DEFAULT_BOARD_COLUMNS } from "@/lib/validations/board";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function CreateBoardForm({ teams }: { teams: AssignTeamOption[] }) {
  const [columns, setColumns] = useState<string[]>([...DEFAULT_BOARD_COLUMNS]);
  const [columnToRemove, setColumnToRemove] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState<BoardActionState, FormData>(
    createBoard,
    null,
  );
  useActionToast(state);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Nazwa tablicy</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Sprint 12 — sklep"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="teamId">Zespół</Label>
        <select
          id="teamId"
          name="teamId"
          required
          defaultValue={teams[0]?.id ?? ""}
          className={selectClassName}
          disabled={teams.length === 0}
        >
          {teams.length === 0 ? (
            <option value="">Brak zespołów</option>
          ) : (
            teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="grid gap-2">
        <Label>Domyślne kolumny</Label>
        <div className="grid gap-2">
          {columns.map((column, index) => (
            <div key={index} className="flex gap-2">
              <Input
                name="column"
                value={column}
                required
                onChange={(event) => {
                  const next = [...columns];
                  next[index] = event.target.value;
                  setColumns(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={columns.length <= 2}
                aria-label="Usuń kolumnę"
                onClick={() => setColumnToRemove(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={columns.length >= 12}
          onClick={() => setColumns([...columns, `Kolumna ${columns.length + 1}`])}
        >
          <Plus />
          Dodaj kolumnę
        </Button>
      </div>

      <Button
        type="submit"
        disabled={pending || teams.length === 0}
        className="w-fit"
      >
        {pending ? "Tworzenie..." : "Utwórz tablicę"}
      </Button>

      <ConfirmDeleteDialog
        hideTrigger
        open={columnToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setColumnToRemove(null);
          }
        }}
        title="Usunąć kolumnę?"
        description={
          columnToRemove !== null
            ? `Kolumna „${columns[columnToRemove]}” zostanie usunięta z formularza.`
            : undefined
        }
        onConfirm={() => {
          if (columnToRemove === null) {
            return;
          }
          setColumns(columns.filter((_, index) => index !== columnToRemove));
          setColumnToRemove(null);
        }}
      />
    </form>
  );
}
