"use client";

import { useActionState } from "react";

import { deleteUser, type AuthActionState } from "@/app/actions/auth";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useActionToast } from "@/hooks/use-action-toast";

export function DeleteUserButton({
  userId,
  userName,
  disabled,
}: {
  userId: string;
  userName: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    deleteUser,
    null,
  );
  useActionToast(state);

  return (
    <ConfirmDeleteDialog
      title="Usunąć konto?"
      description={`Konto „${userName}” zostanie trwale usunięte. Tablice i zadania utworzone przez tę osobę pozostaną (przypisane do Ciebie).`}
      triggerLabel=""
      triggerSize="icon-sm"
      triggerVariant="ghost"
      disabled={disabled}
      pending={pending}
      formAction={formAction}
      hiddenFields={{ userId }}
      closeOnSuccess={state}
    />
  );
}
