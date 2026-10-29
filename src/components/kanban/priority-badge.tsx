import { cn } from "@/lib/utils";
import type { Priority } from "@prisma/client";

const labels: Record<Priority, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
};

const styles: Record<Priority, string> = {
  LOW: "border-emerald-300/80 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200",
  MEDIUM:
    "border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200",
  HIGH: "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-200",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium",
        styles[priority],
        className,
      )}
    >
      {labels[priority]}
    </span>
  );
}
