import type { Metadata } from "next";

import { AssignTaskForm } from "@/components/tasks/assign-task-form";
import {
  TasksDataTable,
  type TasksTableRow,
} from "@/components/tasks/tasks-data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-utils";
import {
  listAssignBoards,
  listAssignMembers,
  listAssignedTasks,
  listTeams,
} from "@/lib/boards";

export const metadata: Metadata = {
  title: "Zadania",
};

const PRIORITY_LABELS = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
} as const;

export default async function TasksPage() {
  const session = await requireAuth();
  const isAdmin = session.user.isAdmin;
  const teamScope = session.user.teamId ?? "00000000-0000-0000-0000-000000000000";

  const [allTeams, allBoards, allMembers, { items: tasks }] = await Promise.all([
    listTeams(),
    listAssignBoards(),
    isAdmin ? listAssignMembers() : Promise.resolve([]),
    listAssignedTasks(
      isAdmin ? {} : { team: teamScope },
      { page: 1, pageSize: 10_000 },
    ),
  ]);

  const teams = isAdmin
    ? allTeams
    : allTeams.filter((team) => team.id === session.user.teamId);
  const boards = isAdmin
    ? allBoards
    : allBoards.filter((board) => board.teamId === teamScope);
  const members = isAdmin ? allMembers : [];

  const rows: TasksTableRow[] = tasks.map((task) => {
    const priorityLabel = PRIORITY_LABELS[task.priority];
    const assigneeNames =
      task.assignees.length === 0
        ? "—"
        : task.assignees.map((assignee) => assignee.name).join(", ");

    return {
      id: task.id,
      title: task.title,
      boardId: task.boardId,
      boardTitle: task.boardTitle,
      teamName: task.teamName,
      columnTitle: task.columnTitle,
      priority: task.priority,
      priorityLabel,
      dueDate: task.dueDate,
      assignees: task.assignees,
      assigneeNames,
      searchText: [
        task.title,
        task.boardTitle,
        task.teamName,
        task.columnTitle,
        assigneeNames,
        priorityLabel,
      ]
        .join(" ")
        .toLowerCase(),
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Zadania</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Wybierz zespół, tablicę i osoby do przydzielenia."
            : "Zadania dostępne dla Twojego zespołu."}
        </p>
      </div>

      {isAdmin ? (
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
      ) : null}

      <Card>
        <TasksDataTable
          data={rows}
          isAdmin={isAdmin}
          description={`${rows.length} ${
            rows.length === 1
              ? "pozycja"
              : rows.length < 5
                ? "pozycje"
                : "pozycji"
          } · sortowanie i filtry kolumn (TanStack Table)`}
        />
      </Card>
    </div>
  );
}
