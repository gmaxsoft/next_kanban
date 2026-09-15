import type { Metadata } from "next";
import Link from "next/link";

import { AssignTaskForm } from "@/components/tasks/assign-task-form";
import { PriorityBadge } from "@/components/kanban/priority-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListFilters } from "@/components/ui/list-filters";
import { ListPagination } from "@/components/ui/list-pagination";
import { requireAdmin } from "@/lib/auth-utils";
import {
  listAssignBoards,
  listAssignMembers,
  listAssignedTasks,
  listTeams,
} from "@/lib/boards";
import { parsePagination, parseTasksListSearch } from "@/lib/list-query";
import { getInitials } from "@/lib/user";

export const metadata: Metadata = {
  title: "Zadania",
};

type TasksPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    team?: string | string[];
    board?: string | string[];
    priority?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function formatDueDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pl-PL", {
    dateStyle: "medium",
  });
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const filters = parseTasksListSearch(params);
  const pagination = parsePagination(params);
  const [teams, boards, members] = await Promise.all([
    listTeams(),
    listAssignBoards(),
    listAssignMembers(),
  ]);

  const boardValid =
    !filters.board ||
    boards.some(
      (board) =>
        board.id === filters.board &&
        (!filters.team || board.teamId === filters.team),
    );
  const effectiveFilters = {
    ...filters,
    board: boardValid ? filters.board : "",
  };

  const { items: tasks, meta } = await listAssignedTasks(
    effectiveFilters,
    pagination,
  );

  const boardOptions = effectiveFilters.team
    ? boards.filter((board) => board.teamId === effectiveFilters.team)
    : boards;
  const hasActiveFilters = Boolean(
    effectiveFilters.q ||
      effectiveFilters.team ||
      effectiveFilters.board ||
      effectiveFilters.priority,
  );
  const listQuery = {
    q: effectiveFilters.q || undefined,
    team: effectiveFilters.team || undefined,
    board: effectiveFilters.board || undefined,
    priority: effectiveFilters.priority || undefined,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Zadania</h2>
        <p className="text-sm text-muted-foreground">
          Wybierz zespół, a potem tablicę i załogę. Dostępne tylko dla
          ADMINISTRATORA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nowe przydzielenie</CardTitle>
          <CardDescription>
            Najpierw wybierz zespół — wtedy pojawią się tablice i osoby z tego
            zespołu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssignTaskForm teams={teams} boards={boards} members={members} />
        </CardContent>
      </Card>

      <ListFilters
        key={`${effectiveFilters.q}|${effectiveFilters.team}|${effectiveFilters.board}|${effectiveFilters.priority}|${meta.pageSize}`}
        pathname="/tasks"
        preserve={{ pageSize: meta.pageSize }}
        fields={[
          {
            type: "search",
            name: "q",
            label: "Szukaj zadania",
            value: effectiveFilters.q,
            placeholder: "np. raport, API...",
          },
          {
            type: "select",
            name: "team",
            label: "Zespół",
            value: effectiveFilters.team,
            emptyLabel: "Wszystkie zespoły",
            clear: ["board"],
            options: teams.map((team) => ({
              value: team.id,
              label: team.name,
            })),
          },
          {
            type: "select",
            name: "board",
            label: "Tablica",
            value: effectiveFilters.board,
            emptyLabel: "Wszystkie tablice",
            options: boardOptions.map((board) => ({
              value: board.id,
              label: board.title,
            })),
          },
          {
            type: "select",
            name: "priority",
            label: "Priorytet",
            value: effectiveFilters.priority,
            emptyLabel: "Wszystkie priorytety",
            options: [
              { value: "HIGH", label: "Wysoki" },
              { value: "MEDIUM", label: "Średni" },
              { value: "LOW", label: "Niski" },
            ],
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ostatnie zadania</CardTitle>
          <CardDescription>
            {meta.total}{" "}
            {meta.total === 1
              ? "pozycja"
              : meta.total < 5
                ? "pozycje"
                : "pozycji"}
            {hasActiveFilters ? " (po filtrach)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 overflow-x-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Brak zadań pasujących do filtrów."
                : "Brak zadań — przydziel pierwsze powyżej."}
            </p>
          ) : (
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Zadanie</th>
                  <th className="py-2 pr-4 font-medium">Zespół</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Załoga</th>
                  <th className="py-2 pr-4 font-medium">Termin</th>
                  <th className="py-2 font-medium">Priorytet</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/boards/${task.boardId}/tasks/${task.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {task.boardTitle}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{task.teamName}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{task.columnTitle}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.assignees.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          task.assignees.map((assignee) => (
                            <span
                              key={assignee.id}
                              className="inline-flex items-center gap-1.5"
                            >
                              <Avatar size="sm" className="size-5">
                                <AvatarImage
                                  src={assignee.avatarUrl ?? undefined}
                                  alt={assignee.name}
                                />
                                <AvatarFallback className="text-[9px]">
                                  {getInitials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs">{assignee.name}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">{formatDueDate(task.dueDate)}</td>
                    <td className="py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <ListPagination pathname="/tasks" meta={meta} query={listQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
