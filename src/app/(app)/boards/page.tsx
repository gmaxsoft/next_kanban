import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import { sampleBoard } from "@/lib/kanban";

export const metadata: Metadata = {
  title: "Tablice",
};

export default function BoardsPage() {
  return (
    <div className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Sprint — produkt</h2>
          <p className="text-sm text-muted-foreground">
            Kolumny i karty w palecie zinc z akcentem indigo. CRUD tablic dojdzie w
            kolejnym kroku.
          </p>
        </div>
        <Button>
          <Plus />
          Utwórz tablicę
        </Button>
      </div>

      <KanbanBoard columns={sampleBoard} />
    </div>
  );
}
