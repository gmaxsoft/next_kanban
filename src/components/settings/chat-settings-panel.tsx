"use client";

import { useActionState } from "react";

import {
  updateChatSettings,
  type SettingsActionState,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

export function ChatSettingsPanel({
  canManage,
  allowTeamSwitch,
}: {
  canManage: boolean;
  allowTeamSwitch: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionState,
    FormData
  >(updateChatSettings, null);
  useActionToast(state);

  return (
    <form action={formAction} className="grid max-w-lg gap-4">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="allowTeamSwitch"
          value="1"
          defaultChecked={allowTeamSwitch}
          disabled={!canManage || pending}
          className="mt-1 size-4 accent-primary"
        />
        <span className="grid gap-1">
          <span className="font-medium leading-none">
            Pozwalaj zmieniać zespół w czacie
          </span>
          <span className="text-xs text-muted-foreground">
            Wyłączone (domyślnie): każdy widzi tylko czat swojego zespołu.
            Włączone: lista wszystkich zespołów jak dotychczas.
          </span>
        </span>
      </label>
      {canManage ? (
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Zapisywanie…" : "Zapisz"}
        </Button>
      ) : null}
    </form>
  );
}
