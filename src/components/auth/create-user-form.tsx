"use client";

import { useActionState } from "react";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { createUser, type AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    createUser,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {state?.error ? (
        <Alert variant="destructive" className="sm:col-span-2">
          <AlertCircleIcon />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state?.success ? (
        <Alert className="sm:col-span-2">
          <CheckCircle2Icon />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

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
        <Label htmlFor="role">Rola</Label>
        <select id="role" name="role" defaultValue="USER" className={selectClassName}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
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
