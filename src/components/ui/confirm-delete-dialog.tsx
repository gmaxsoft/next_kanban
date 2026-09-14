"use client";

import { useEffect, useState, useTransition, type ComponentProps } from "react";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  triggerLabel?: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerSize?: ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  pending?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
  onConfirm?: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  closeOnSuccess?: { success?: string } | null;
};

export function ConfirmDeleteDialog({
  title = "Na pewno usunąć?",
  description = "Tej operacji nie można cofnąć.",
  confirmLabel = "Usuń",
  triggerLabel = "Usuń",
  triggerVariant = "ghost",
  triggerSize = "sm",
  disabled = false,
  pending = false,
  formAction,
  hiddenFields,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  closeOnSuccess,
}: ConfirmDeleteDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
  }

  useEffect(() => {
    if (closeOnSuccess?.success) {
      setOpen(false);
    }
    // intentionally only when success message appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeOnSuccess?.success]);

  function handleClientConfirm() {
    if (!onConfirm) {
      return;
    }

    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  }

  const busy = pending || isPending;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          disabled={disabled || busy}
          aria-label={title}
          onClick={() => setOpen(true)}
        >
          <Trash2 />
          {triggerLabel ? <span>{triggerLabel}</span> : null}
        </Button>
      ) : null}

      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Anuluj</AlertDialogCancel>
          {formAction ? (
            <form action={formAction} className="contents">
              {hiddenFields
                ? Object.entries(hiddenFields).map(([name, value]) => (
                    <input key={name} type="hidden" name={name} value={value} />
                  ))
                : null}
              <AlertDialogAction
                type="submit"
                variant="destructive"
                disabled={busy}
              >
                {busy ? "Usuwanie..." : confirmLabel}
              </AlertDialogAction>
            </form>
          ) : (
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={handleClientConfirm}
            >
              {busy ? "Usuwanie..." : confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
