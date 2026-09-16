"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import {
  createTeam,
  deleteTeam,
  updateTeam,
  type SettingsActionState,
} from "@/app/actions/settings";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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

export type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  inboundEmail: string | null;
  userCount: number;
};

export function TeamsPanel({
  teams,
  canManage,
}: {
  teams: TeamRow[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [createState, createAction, createPending] = useActionState<
    SettingsActionState,
    FormData
  >(createTeam, null);
  useActionToast(createState);

  const filteredTeams = teams.filter((team) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      team.name.toLowerCase().includes(q) ||
      (team.description ?? "").toLowerCase().includes(q) ||
      (team.inboundEmail ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid gap-6">
      {canManage ? (
        <form
          action={createAction}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="team-name">Nowy zespół</Label>
            <Input
              id="team-name"
              name="name"
              required
              maxLength={80}
              placeholder="np. Marketing"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="team-description">Opis</Label>
            <Input
              id="team-description"
              name="description"
              maxLength={255}
              placeholder="Opcjonalnie"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="team-inbound">Skrzynka ticketów</Label>
            <Input
              id="team-inbound"
              name="inboundEmail"
              type="email"
              maxLength={255}
              placeholder="np. it@pwginfo.pl"
            />
          </div>
          <Button type="submit" disabled={createPending}>
            <Plus />
            {createPending ? "Dodawanie..." : "Dodaj"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Zespołami może zarządzać tylko ADMINISTRATOR.
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="teams-filter">Filtruj zespoły</Label>
        <Input
          id="teams-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj po nazwie lub opisie..."
        />
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Nazwa</th>
              <th className="px-3 py-2 font-medium">Opis</th>
              <th className="px-3 py-2 font-medium">Skrzynka</th>
              <th className="px-3 py-2 font-medium">Członkowie</th>
              {canManage ? (
                <th className="px-3 py-2 font-medium">Akcje</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredTeams.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-3 py-4 text-sm text-muted-foreground"
                >
                  Brak zespołów pasujących do filtra.
                </td>
              </tr>
            ) : (
              filteredTeams.map((team) => (
                <tr key={team.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{team.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {team.description || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {team.inboundEmail || "—"}
                  </td>
                  <td className="px-3 py-2.5">{team.userCount}</td>
                  {canManage ? (
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <EditTeamButton team={team} />
                        <DeleteTeamButton
                          teamId={team.id}
                          teamName={team.name}
                          disabled={team.userCount > 0}
                        />
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

function EditTeamButton({ team }: { team: TeamRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    SettingsActionState,
    FormData
  >(updateTeam, null);
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
            <SheetTitle>Edycja zespołu</SheetTitle>
            <SheetDescription>{team.name}</SheetDescription>
          </SheetHeader>
          <form action={formAction} className="grid gap-4 p-4">
            <input type="hidden" name="teamId" value={team.id} />
            <div className="grid gap-2">
              <Label htmlFor={`team-edit-name-${team.id}`}>Nazwa</Label>
              <Input
                id={`team-edit-name-${team.id}`}
                name="name"
                required
                defaultValue={team.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`team-edit-desc-${team.id}`}>Opis</Label>
              <Input
                id={`team-edit-desc-${team.id}`}
                name="description"
                defaultValue={team.description ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`team-edit-inbound-${team.id}`}>
                Skrzynka ticketów
              </Label>
              <Input
                id={`team-edit-inbound-${team.id}`}
                name="inboundEmail"
                type="email"
                defaultValue={team.inboundEmail ?? ""}
                placeholder="np. it@pwginfo.pl"
              />
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

function DeleteTeamButton({
  teamId,
  teamName,
  disabled,
}: {
  teamId: string;
  teamName: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionState,
    FormData
  >(deleteTeam, null);
  useActionToast(state);

  return (
    <ConfirmDeleteDialog
      title="Usunąć zespół?"
      description={`Zespół „${teamName}” zostanie trwale usunięty.`}
      disabled={disabled}
      pending={pending}
      formAction={formAction}
      hiddenFields={{ teamId }}
      closeOnSuccess={state}
    />
  );
}
