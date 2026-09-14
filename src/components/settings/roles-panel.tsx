"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import {
  createRole,
  deleteRole,
  updateRole,
  type SettingsActionState,
} from "@/app/actions/settings";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
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
import { SYSTEM_ADMIN_SLUG } from "@/lib/rbac";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type RoleRow = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  isAdmin: boolean;
  userCount: number;
};

export function RolesPanel({
  roles,
  canManage,
}: {
  roles: RoleRow[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [createState, createAction, createPending] = useActionState<
    SettingsActionState,
    FormData
  >(createRole, null);
  useActionToast(createState);

  const filteredRoles = roles.filter((role) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      role.name.toLowerCase().includes(q) || role.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid gap-6">
      {canManage ? (
        <form
          action={createAction}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="role-name">Nowa rola</Label>
            <Input
              id="role-name"
              name="name"
              required
              maxLength={60}
              placeholder="np. Lider"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-admin">Uprawnienia</Label>
            <select
              id="role-admin"
              name="isAdmin"
              defaultValue="false"
              className={selectClassName}
            >
              <option value="false">Standardowe</option>
              <option value="true">Jak administrator</option>
            </select>
          </div>
          <Button type="submit" disabled={createPending}>
            <Plus />
            {createPending ? "Dodawanie..." : "Dodaj"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Role może zarządzać tylko ADMINISTRATOR.
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="roles-filter">Filtruj role</Label>
        <Input
          id="roles-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj po nazwie lub slug..."
        />
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Nazwa</th>
              <th className="px-3 py-2 font-medium">Uprawnienia</th>
              <th className="px-3 py-2 font-medium">Użytkownicy</th>
              {canManage ? (
                <th className="px-3 py-2 font-medium">Akcje</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredRoles.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 4 : 3}
                  className="px-3 py-4 text-sm text-muted-foreground"
                >
                  Brak ról pasujących do filtra.
                </td>
              </tr>
            ) : (
              filteredRoles.map((role) => (
                <tr key={role.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{role.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {role.slug}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={role.isAdmin ? "default" : "secondary"}>
                      {role.isAdmin ? "Administrator" : "Standardowe"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">{role.userCount}</td>
                  {canManage ? (
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <EditRoleButton role={role} />
                        {role.slug === SYSTEM_ADMIN_SLUG ? (
                          <span className="self-center text-xs text-muted-foreground">
                            Chroniona
                          </span>
                        ) : (
                          <DeleteRoleButton
                            roleId={role.id}
                            roleName={role.name}
                            disabled={role.userCount > 0}
                          />
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditRoleButton({ role }: { role: RoleRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    SettingsActionState,
    FormData
  >(updateRole, null);
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
        <SheetContent showCloseButton className="w-full sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Edycja roli</SheetTitle>
            <SheetDescription>{role.slug}</SheetDescription>
          </SheetHeader>
          <form action={formAction} className="grid gap-4 p-4">
            <input type="hidden" name="roleId" value={role.id} />
            <div className="grid gap-2">
              <Label htmlFor={`role-edit-name-${role.id}`}>Nazwa</Label>
              <Input
                id={`role-edit-name-${role.id}`}
                name="name"
                required
                defaultValue={role.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`role-edit-admin-${role.id}`}>Uprawnienia</Label>
              <select
                id={`role-edit-admin-${role.id}`}
                name="isAdmin"
                defaultValue={role.isAdmin ? "true" : "false"}
                className={selectClassName}
                disabled={role.slug === SYSTEM_ADMIN_SLUG}
              >
                <option value="false">Standardowe</option>
                <option value="true">Jak administrator</option>
              </select>
            </div>
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DeleteRoleButton({
  roleId,
  roleName,
  disabled,
}: {
  roleId: string;
  roleName: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionState,
    FormData
  >(deleteRole, null);
  useActionToast(state);

  return (
    <ConfirmDeleteDialog
      title="Usunąć rolę?"
      description={`Rola „${roleName}” zostanie trwale usunięta.`}
      disabled={disabled}
      pending={pending}
      formAction={formAction}
      hiddenFields={{ roleId }}
      closeOnSuccess={state}
    />
  );
}
