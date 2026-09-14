"use client";

import { useActionState, useRef, useState } from "react";
import { Upload } from "lucide-react";

import {
  removeAvatar,
  updateAvatar,
  type AuthActionState,
} from "@/app/actions/auth";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { getInitials } from "@/lib/user";

export function AvatarUploadForm({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [updateState, updateAction, updatePending] = useActionState<
    AuthActionState,
    FormData
  >(updateAvatar, null);
  const [removeState, removeAction, removePending] = useActionState<
    AuthActionState,
    FormData
  >(async () => removeAvatar(), null);

  useActionToast(updateState);
  useActionToast(removeState);

  const displayImage = preview ?? image ?? undefined;
  const pending = updatePending || removePending;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-20">
          <AvatarImage src={displayImage} alt={name ?? "Profil"} />
          <AvatarFallback className="text-base">{getInitials(name)}</AvatarFallback>
        </Avatar>

        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            JPG, PNG, GIF lub WebP · max 2 MB. Zdjęcie pojawi się w czacie,
            navbarze i na kartach zadań.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={updateAction} className="contents">
              <input
                ref={inputRef}
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setPreview(null);
                    return;
                  }
                  setPreview(URL.createObjectURL(file));
                  event.currentTarget.form?.requestSubmit();
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
              >
                <Upload />
                {pending ? "Zapisywanie..." : "Wgraj zdjęcie"}
              </Button>
            </form>

            {image ? (
              <ConfirmDeleteDialog
                title="Usunąć zdjęcie profilowe?"
                description="Awatar zostanie usunięty z konta."
                pending={removePending}
                formAction={removeAction}
                closeOnSuccess={removeState}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
