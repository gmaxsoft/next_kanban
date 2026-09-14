"use client";

import { useActionState } from "react";

import { createUser, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { SYSTEM_USER_ROLE_ID } from "@/lib/rbac";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function CreateUserForm({
  roles,
  teams,
  defaultTeamId,
}: {
  roles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  defaultTeamId?: string | null;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    createUser,
    null,
  );
  useActionToast(state);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="name">Imię i nazwisko</Label>
        <Input id="name" name="name" required placeholder="Anna Kowalska" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="anna@firma.pl"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Hasło tymczasowe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="roleId">Rola</Label>
        <select
          id="roleId"
          name="roleId"
          defaultValue={SYSTEM_USER_ROLE_ID}
          className={selectClassName}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="teamId">Zespół</Label>
        <select
          id="teamId"
          name="teamId"
          defaultValue={defaultTeamId ?? ""}
          className={selectClassName}
        >
          <option value="">Bez zespołu</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Tworzenie..." : "Utwórz konto"}
        </Button>
      </div>
    </form>
  );
}
