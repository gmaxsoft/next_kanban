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
import { ListFilters, type ListFilterField } from "@/components/ui/list-filters";
import { ListPagination } from "@/components/ui/list-pagination";
import { requireUnrestrictedAuth } from "@/lib/auth-utils";
import { listBoards, listTeams } from "@/lib/boards";
import {
  parseBoardsListSearch,
  parsePagination,
} from "@/lib/list-query";

export const metadata: Metadata = {
  title: "Tablice",
};

type BoardsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    team?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

export default async function BoardsPage({ searchParams }: BoardsPageProps) {
  const session = await requireUnrestrictedAuth();
  const isAdmin = session.user.isAdmin;
  const teamScope = session.user.teamId ?? "00000000-0000-0000-0000-000000000000";
  const params = await searchParams;
  const filters = parseBoardsListSearch(params);
  const effectiveFilters = isAdmin ? filters : { ...filters, team: teamScope };
  const pagination = parsePagination(params);
  const [{ items: boards, meta }, allTeams] = await Promise.all([
    listBoards(effectiveFilters, pagination),
    listTeams(),
  ]);
  const teams = isAdmin
    ? allTeams
    : allTeams.filter((team) => team.id === session.user.teamId);
  const hasActiveFilters = Boolean(filters.q || (isAdmin && filters.team));
  const listQuery = {
    q: effectiveFilters.q || undefined,
    team: effectiveFilters.team || undefined,
  };
  const filterFields: ListFilterField[] = [
    {
      type: "search",
      name: "q",
      label: "Szukaj tablicy",
      value: filters.q,
      placeholder: "np. PWG, sprint...",
    },
    ...(isAdmin
      ? [
          {
            type: "select" as const,
            name: "team",
            label: "Zespół",
            value: filters.team,
            emptyLabel: "Wszystkie zespoły",
            options: teams.map((team) => ({
              value: team.id,
              label: team.name,
            })),
          },
        ]
      : []),
  ];

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
              Tylko ADMINISTRATOR może utworzyć tablicę, przypisać ją do zespołu
              i zdefiniować kolumny, np. To Do, In Progress, Code Review, Done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBoardForm teams={teams} />
          </CardContent>
        </Card>
      ) : null}

      <ListFilters
        key={`${filters.q}|${filters.team}|${meta.pageSize}`}
        pathname="/boards"
        preserve={{ pageSize: meta.pageSize }}
        fields={filterFields}
      />

      {boards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {hasActiveFilters ? "Brak wyników" : "Brak tablic"}
            </CardTitle>
            <CardDescription>
              {hasActiveFilters
                ? "Zmień filtry, aby zobaczyć inne tablice."
                : isAdmin
                  ? "Utwórz pierwszą tablicę powyżej."
                  : "Poproś administratora o utworzenie tablicy."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
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
                    <Badge variant="outline">{board.teamName}</Badge>
                    <Badge variant="secondary">{board.columnCount} kolumn</Badge>
                    <Badge variant="secondary">{board.taskCount} zadań</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <ListPagination pathname="/boards" meta={meta} query={listQuery} />
        </div>
      )}
    </div>
  );
}
