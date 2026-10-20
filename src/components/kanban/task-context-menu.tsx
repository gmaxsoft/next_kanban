"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  archiveTask,
  deleteTask,
  restoreArchivedTask,
} from "@/app/actions/boards";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

type MenuMode = "active" | "archive";

type ContextHandlers = {
  onContextMenu: (event: React.MouseEvent) => void;
};

export function TaskContextMenu({
  boardId,
  taskId,
  taskTitle,
  canDelete,
  mode = "active",
  children,
}: {
  boardId: string;
  taskId: string;
  taskTitle: string;
  canDelete: boolean;
  mode?: MenuMode;
  children: (handlers: ContextHandlers) => ReactNode;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;

    function close() {
      setMenu(null);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 8;
    let x = menu.x;
    let y = menu.y;
    if (x + rect.width > window.innerWidth - pad) {
      x = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (y + rect.height > window.innerHeight - pad) {
      y = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    if (x !== menu.x || y !== menu.y) {
      setMenu({ x, y });
    }
  }, [menu]);

  function runAction(
    action: () => Promise<{ error?: string; success?: string } | null>,
  ) {
    setMenu(null);
    startTransition(() => {
      void action().then((result) => {
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? "Gotowe.");
        router.refresh();
      });
    });
  }

  return (
    <>
      {children({
        onContextMenu: (event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenu({ x: event.clientX, y: event.clientY });
        },
      })}

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-48 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {mode === "active" ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
              onClick={() => runAction(() => archiveTask(boardId, taskId))}
            >
              <Archive className="size-3.5" />
              Przenieś do archiwum
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
              onClick={() =>
                runAction(() => restoreArchivedTask(boardId, taskId))
              }
            >
              <RotateCcw className="size-3.5" />
              Przywróć na tablicę
            </button>
          )}

          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-destructive hover:bg-destructive/10 disabled:opacity-50"
              onClick={() => {
                setMenu(null);
                setConfirmDelete(true);
              }}
            >
              <Trash2 className="size-3.5" />
              Usuń
            </button>
          ) : null}
        </div>
      ) : null}

      {canDelete ? (
        <ConfirmDeleteDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          hideTrigger
          title="Usunąć zadanie?"
          description={`Zadanie „${taskTitle}” zostanie trwale usunięte wraz z komentarzami i załącznikami.`}
          confirmLabel="Usuń"
          pending={pending}
          onConfirm={() => runAction(() => deleteTask(boardId, taskId))}
        />
      ) : null}
    </>
  );
}
