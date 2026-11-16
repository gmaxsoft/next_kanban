"use client";

import { useActionState } from "react";

import { activateAccount, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

export function ActivateAccountForm({
  token,
  email,
}: {
  token: string;
  email?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    activateAccount,
    null,
  );
  useActionToast(state);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="token" value={token} />

      {email ? (
        <div className="grid gap-1">
          <p className="text-xs font-medium text-muted-foreground">E-mail</p>
          <p className="text-sm font-medium">{email}</p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="password">Nowe hasło</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          disabled={pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Aktywowanie…" : "Aktywuj konto"}
      </Button>
    </form>
  );
}
