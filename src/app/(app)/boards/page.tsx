import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tablice",
};

export default function BoardsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tablice</h2>
          <p className="text-sm text-muted-foreground">
            Tutaj pojawią się Twoje tablice Kanban.
          </p>
        </div>
        <Button>
          <Plus />
          Utwórz tablicę
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brak tablic</CardTitle>
          <CardDescription>
            Utwórz pierwszą tablicę, aby dodać kolumny i zadania.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CRUD tablic zostanie dodany w kolejnym kroku.
        </CardContent>
      </Card>
    </div>
  );
}
