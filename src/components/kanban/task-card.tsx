import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/kanban/priority-badge";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { BoardTask } from "@/lib/kanban";
import { getInitials } from "@/lib/user";
import { isEmptyRichText } from "@/lib/rich-text";

function formatDueDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

export function TaskCard({ task }: { task: BoardTask }) {
  const dueLabel = formatDueDate(task.dueDate);

  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm leading-snug font-medium text-card-foreground">
          {task.title}
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {!isEmptyRichText(task.description) ? (
        <RichTextContent
          value={task.description}
          excerpt
          excerptLength={100}
          className="mt-1.5 line-clamp-2 text-xs leading-5"
        />
      ) : null}

      {dueLabel ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Termin: {dueLabel}</p>
      ) : null}

      {task.assignees.length > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar key={assignee.id} size="sm" className="size-6 ring-2 ring-card">
                <AvatarImage
                  src={assignee.avatarUrl ?? undefined}
                  alt={assignee.name}
                />
                <AvatarFallback className="text-[10px]">
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {task.assignees.length === 1
              ? task.assignees[0].name
              : `${task.assignees.length} osoby`}
          </span>
        </div>
      ) : null}
    </article>
  );
}
