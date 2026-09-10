"use client";

import { useActionState } from "react";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { changePassword, type AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    changePassword,
    null,
  );

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state?.success ? (
        <Alert>
          <CheckCircle2Icon />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Obecne hasło</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newPassword">Nowe hasło</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Zapisywanie..." : "Zmień hasło"}
      </Button>
    </form>
  );
}
