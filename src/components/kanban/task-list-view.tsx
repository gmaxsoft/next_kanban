"use client";

import { useRouter } from "next/navigation";

import { PriorityBadge } from "@/components/kanban/priority-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { boardPath, type BoardView } from "@/lib/board-query";
import type { BoardColumn } from "@/lib/kanban";
import { isEmptyRichText } from "@/lib/rich-text";
import { getInitials } from "@/lib/user";

function formatDueDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pl-PL", {
    dateStyle: "medium",
  });
}

type ListRow = {
  id: string;
  title: string;
  description?: string;
  priority: BoardColumn["tasks"][number]["priority"];
  dueDate?: string | null;
  assignees: BoardColumn["tasks"][number]["assignees"];
  columnTitle: string;
  columnOrder: number;
  taskOrder: number;
};

export function TaskListView({
  boardId,
  columns,
  q,
  assignee,
  view,
}: {
  boardId: string;
  columns: BoardColumn[];
  q: string;
  assignee: string;
  view: BoardView;
}) {
  const router = useRouter();

  const rows: ListRow[] = columns
    .flatMap((column, columnOrder) =>
      column.tasks.map((task, taskOrder) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        assignees: task.assignees,
        columnTitle: column.title,
        columnOrder,
        taskOrder,
      })),
    )
    .sort((a, b) => {
      if (a.columnOrder !== b.columnOrder) {
        return a.columnOrder - b.columnOrder;
      }
      return a.taskOrder - b.taskOrder;
    });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Brak zadań na tej tablicy.</p>
    );
  }

  function openTask(taskId: string) {
    router.replace(boardPath(boardId, { q, assignee, view, taskId }));
  }

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Zadanie</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Załoga</th>
            <th className="px-3 py-2.5 font-medium">Termin</th>
            <th className="px-3 py-2.5 font-medium">Priorytet</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
              onClick={() => openTask(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openTask(row.id);
                }
              }}
              tabIndex={0}
              role="link"
            >
              <td className="px-3 py-3 align-top">
                <p className="font-medium">{row.title}</p>
                {!isEmptyRichText(row.description) ? (
                  <RichTextContent
                    value={row.description}
                    excerpt
                    excerptLength={90}
                    className="mt-0.5 line-clamp-1 text-xs"
                  />
                ) : null}
              </td>
              <td className="px-3 py-3 align-top">
                <Badge variant="secondary">{row.columnTitle}</Badge>
              </td>
              <td className="px-3 py-3 align-top">
                {row.assignees.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {row.assignees.map((person) => (
                      <span
                        key={person.id}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Avatar size="sm" className="size-5">
                          <AvatarImage
                            src={person.avatarUrl ?? undefined}
                            alt={person.name}
                          />
                          <AvatarFallback className="text-[9px]">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{person.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 align-top whitespace-nowrap">
                {formatDueDate(row.dueDate)}
              </td>
              <td className="px-3 py-3 align-top">
                <PriorityBadge priority={row.priority} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
