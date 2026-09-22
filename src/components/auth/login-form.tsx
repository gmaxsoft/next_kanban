"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";

import { login, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    login,
    null,
  );
  useActionToast(state);

  return (
    <form action={formAction} className="grid w-full max-w-md gap-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="grid gap-2">
        <Label htmlFor="email" className="text-xs font-semibold tracking-[0.14em] uppercase">
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="jan@firma.pl"
          className="h-12 border-foreground/20 bg-background px-3 text-base"
        />
      </div>

      <div className="grid gap-2">
        <Label
          htmlFor="password"
          className="text-xs font-semibold tracking-[0.14em] uppercase"
        >
          Hasło
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 border-foreground/20 bg-background px-3 text-base"
        />
      </div>

      <label
        htmlFor="rememberMe"
        className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
      >
        <input
          id="rememberMe"
          name="rememberMe"
          type="checkbox"
          value="on"
          defaultChecked
          className="size-4 accent-primary"
        />
        <span>Zapamiętaj mnie</span>
      </label>

      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="h-12 w-full gap-2 text-sm font-semibold tracking-[0.08em] uppercase"
      >
        {pending ? "Logowanie..." : "Wejdź do panelu"}
        {!pending ? <ArrowRight /> : null}
      </Button>
    </form>
  );
}
