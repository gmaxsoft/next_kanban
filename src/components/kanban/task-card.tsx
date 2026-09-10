import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/kanban/priority-badge";
import type { BoardTask } from "@/lib/kanban";
import { getInitials } from "@/lib/user";

export function TaskCard({ task }: { task: BoardTask }) {
  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm leading-snug font-medium text-card-foreground">
          {task.title}
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      {task.assignee ? (
        <div className="mt-3 flex items-center gap-2">
          <Avatar size="sm" className="size-6">
            <AvatarImage
              src={task.assignee.avatarUrl ?? undefined}
              alt={task.assignee.name}
            />
            <AvatarFallback className="text-[10px]">
              {getInitials(task.assignee.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">
            {task.assignee.name}
          </span>
        </div>
      ) : null}
    </article>
  );
}
