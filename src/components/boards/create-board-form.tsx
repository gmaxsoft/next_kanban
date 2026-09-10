"use client";

import { useState } from "react";
import { useActionState } from "react";
import { AlertCircleIcon, Plus, Trash2 } from "lucide-react";

import { createBoard, type BoardActionState } from "@/app/actions/boards";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BOARD_COLUMNS } from "@/lib/validations/board";

export function CreateBoardForm() {
  const [columns, setColumns] = useState<string[]>([...DEFAULT_BOARD_COLUMNS]);
  const [state, formAction, pending] = useActionState<BoardActionState, FormData>(
    createBoard,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

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
                onClick={() =>
                  setColumns(columns.filter((_, columnIndex) => columnIndex !== index))
                }
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

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Tworzenie..." : "Utwórz tablicę"}
      </Button>
    </form>
  );
}
