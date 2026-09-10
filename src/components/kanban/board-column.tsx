import { TaskCard } from "@/components/kanban/task-card";
import type { BoardColumn } from "@/lib/kanban";

export function BoardColumn({ column }: { column: BoardColumn }) {
  return (
    <section className="flex w-80 shrink-0 flex-col rounded-xl bg-muted/50 p-3">
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold tracking-tight">{column.title}</h3>
        <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
          {column.tasks.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
