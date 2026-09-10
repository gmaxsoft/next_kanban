import type { Metadata } from "next";
import Link from "next/link";
import { Columns3 } from "lucide-react";

import { CreateBoardForm } from "@/components/boards/create-board-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-utils";
import { listBoards } from "@/lib/boards";

export const metadata: Metadata = {
  title: "Tablice",
};

export default async function BoardsPage() {
  const session = await requireAuth();
  const boards = await listBoards();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Tablice</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Twórz tablice i ustalaj kolumny startowe dla zespołu."
            : "Otwórz tablicę, aby przesuwać zadania między kolumnami."}
        </p>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Nowa tablica</CardTitle>
            <CardDescription>
              Tylko ADMIN może utworzyć tablicę i zdefiniować kolumny, np. To Do,
              In Progress, Code Review, Done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBoardForm />
          </CardContent>
        </Card>
      ) : null}

      {boards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Brak tablic</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Utwórz pierwszą tablicę powyżej."
                : "Poproś administratora o utworzenie tablicy."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/boards/${board.id}`} className="block">
              <Card className="h-full shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{board.title}</CardTitle>
                    <Columns3 className="size-4 text-muted-foreground" />
                  </div>
                  <CardDescription>
                    {board.createdByName} ·{" "}
                    {board.createdAt.toLocaleDateString("pl-PL")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{board.columnCount} kolumn</Badge>
                  <Badge variant="secondary">{board.taskCount} zadań</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
