"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import {
  createRole,
  deleteRole,
  updateRole,
  type SettingsActionState,
} from "@/app/actions/settings";
import {
  RolesDataTable,
  type RolesTableRow,
} from "@/components/settings/roles-data-table";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DraggableDialog,
  DraggableDialogContent,
} from "@/components/ui/draggable-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [createState, createAction, createPending] = useActionState<
    SettingsActionState,
    FormData
  >(createRole, null);
  useActionToast(createState);

  const rows: RolesTableRow[] = useMemo(
    () =>
      roles.map((role) => {
        const permissionLabel = role.isAdmin
          ? "Administrator"
          : "Standardowe";
        return {
          ...role,
          permissionLabel,
          searchText: [role.name, role.slug, permissionLabel]
            .join(" ")
            .toLowerCase(),
        };
      }),
    [roles],
  );

  const renderActions = useCallback(
    (role: RolesTableRow) => (
      <>
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
      </>
    ),
    [],
  );

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

      <RolesDataTable
        data={rows}
        canManage={canManage}
        renderActions={canManage ? renderActions : undefined}
      />
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
      <DraggableDialog open={open} onOpenChange={setOpen}>
        <DraggableDialogContent
          title="Edycja roli"
          description={role.slug}
          open={open}
        >
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
        </DraggableDialogContent>
      </DraggableDialog>
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
