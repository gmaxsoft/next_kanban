"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { updateUser, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionToast } from "@/hooks/use-action-toast";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  teamId: string | null;
  isActive: boolean;
};

export function EditUserButton({
  user,
  roles,
  teams,
  canManageRoleAndStatus,
  canResetPassword,
}: {
  user: EditableUser;
  roles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  canManageRoleAndStatus: boolean;
  canResetPassword: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    updateUser,
    null,
  );
  useActionToast(state);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state?.success]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Pencil />
        Edytuj
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          showCloseButton
          className="w-full gap-0 overflow-y-auto sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Edycja konta</SheetTitle>
            <SheetDescription>
              {user.name} · {user.roleName}
            </SheetDescription>
          </SheetHeader>

          <form action={formAction} className="grid gap-4 p-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid gap-2">
              <Label htmlFor={`edit-name-${user.id}`}>Imię i nazwisko</Label>
              <Input
                id={`edit-name-${user.id}`}
                name="name"
                required
                defaultValue={user.name}
                key={`${user.id}-name-${user.name}`}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-email-${user.id}`}>E-mail</Label>
              <Input
                id={`edit-email-${user.id}`}
                name="email"
                type="email"
                required
                defaultValue={user.email}
                key={`${user.id}-email-${user.email}`}
              />
            </div>

            {canManageRoleAndStatus ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`edit-role-${user.id}`}>Rola</Label>
                  <select
                    id={`edit-role-${user.id}`}
                    name="roleId"
                    defaultValue={user.roleId}
                    className={selectClassName}
                    key={`${user.id}-role-${user.roleId}`}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`edit-team-${user.id}`}>Zespół</Label>
                  <select
                    id={`edit-team-${user.id}`}
                    name="teamId"
                    defaultValue={user.teamId ?? ""}
                    className={selectClassName}
                    key={`${user.id}-team-${user.teamId}`}
                  >
                    <option value="">Bez zespołu</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`edit-active-${user.id}`}>Status</Label>
                  <select
                    id={`edit-active-${user.id}`}
                    name="isActive"
                    defaultValue={user.isActive ? "true" : "false"}
                    className={selectClassName}
                    key={`${user.id}-active-${user.isActive}`}
                  >
                    <option value="true">Aktywny</option>
                    <option value="false">Nieaktywny</option>
                  </select>
                </div>
              </>
            ) : null}

            {canResetPassword ? (
              <div className="grid gap-2">
                <Label htmlFor={`edit-password-${user.id}`}>
                  Nowe hasło (opcjonalnie)
                </Label>
                <Input
                  id={`edit-password-${user.id}`}
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  placeholder="Pozostaw puste, aby nie zmieniać"
                  autoComplete="new-password"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hasło do własnego konta zmienisz w zakładce Profil.
              </p>
            )}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
