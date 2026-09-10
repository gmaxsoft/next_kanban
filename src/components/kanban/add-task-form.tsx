"use client";

import { useActionState } from "react";
import { AlertCircleIcon, Plus } from "lucide-react";

import { createTask, type BoardActionState } from "@/app/actions/boards";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function AddTaskForm({
  boardId,
  columnId,
}: {
  boardId: string;
  columnId: string;
}) {
  const [state, formAction, pending] = useActionState<BoardActionState, FormData>(
    createTask,
    null,
  );

  return (
    <form action={formAction} className="mt-2 grid gap-2">
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />
      {state?.error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Input name="title" placeholder="Nowe zadanie..." required maxLength={120} />
      <div className="flex items-center gap-2">
        <select name="priority" defaultValue="MEDIUM" className={selectClassName}>
          <option value="LOW">Niski</option>
          <option value="MEDIUM">Średni</option>
          <option value="HIGH">Wysoki</option>
        </select>
        <Button type="submit" size="sm" disabled={pending} className="ml-auto">
          <Plus />
          {pending ? "Dodawanie..." : "Dodaj"}
        </Button>
      </div>
    </form>
  );
}
