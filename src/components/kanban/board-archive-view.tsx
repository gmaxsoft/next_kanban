"use client";

import { useRouter } from "next/navigation";

import { PriorityBadge } from "@/components/kanban/priority-badge";
import { TaskContextMenu } from "@/components/kanban/task-context-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { taskPath } from "@/lib/board-query";
import type { ArchivedBoardTask } from "@/lib/boards";
import { getInitials } from "@/lib/user";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function BoardArchiveView({
  boardId,
  tasks,
  canDelete,
}: {
  boardId: string;
  tasks: ArchivedBoardTask[];
  canDelete: boolean;
}) {
  const router = useRouter();

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Archiwum jest puste. Kliknij prawym przyciskiem na zadanie na tablicy i
        wybierz „Przenieś do archiwum”.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Zadanie</th>
            <th className="px-3 py-2.5 font-medium">Kolumna</th>
            <th className="px-3 py-2.5 font-medium">Załoga</th>
            <th className="px-3 py-2.5 font-medium">Priorytet</th>
            <th className="px-3 py-2.5 font-medium">Archiwizowano</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskContextMenu
              key={task.id}
              boardId={boardId}
              taskId={task.id}
              taskTitle={task.title}
              canDelete={canDelete}
              mode="archive"
            >
              {({ onContextMenu }) => (
                <tr
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => router.push(taskPath(boardId, task.id))}
                  onContextMenu={onContextMenu}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{task.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="secondary">{task.columnTitle}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
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
                  <td className="px-3 py-2.5">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <div className="grid">
                      <span>{formatDate(task.archivedAt)}</span>
                      <span className="text-xs">{task.archivedByName}</span>
                    </div>
                  </td>
                </tr>
              )}
            </TaskContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
}
