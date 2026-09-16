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
  inboundType: "WEBHOOK" | "IMAP";
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapSecure: boolean;
  imapMailbox: string | null;
  hasImapPassword: boolean;
  userCount: number;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function InboundFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults?: Partial<TeamRow>;
}) {
  const [inboundType, setInboundType] = useState<"WEBHOOK" | "IMAP">(
    defaults?.inboundType ?? "WEBHOOK",
  );

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-inbound`}>Skrzynka ticketów</Label>
        <Input
          id={`${idPrefix}-inbound`}
          name="inboundEmail"
          type="email"
          maxLength={255}
          defaultValue={defaults?.inboundEmail ?? ""}
          placeholder="np. it@pwginfo.pl"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-inbound-type`}>Tryb odbioru</Label>
        <select
          id={`${idPrefix}-inbound-type`}
          name="inboundType"
          className={selectClassName}
          value={inboundType}
          onChange={(event) =>
            setInboundType(event.target.value === "IMAP" ? "IMAP" : "WEBHOOK")
          }
        >
          <option value="WEBHOOK">Webhook (Resend / JSON)</option>
          <option value="IMAP">IMAP (poll cron)</option>
        </select>
      </div>

      {inboundType === "IMAP" ? (
        <div className="grid gap-3 rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            Cron `GET/POST /api/cron/check-imap` pobiera nieprzeczytane maile
            (Authorization: Bearer CRON_SECRET).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor={`${idPrefix}-imap-host`}>Host IMAP</Label>
              <Input
                id={`${idPrefix}-imap-host`}
                name="imapHost"
                defaultValue={defaults?.imapHost ?? ""}
                placeholder="imap.example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-imap-port`}>Port</Label>
              <Input
                id={`${idPrefix}-imap-port`}
                name="imapPort"
                type="number"
                defaultValue={defaults?.imapPort ?? 993}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-imap-secure`}>TLS/SSL</Label>
              <select
                id={`${idPrefix}-imap-secure`}
                name="imapSecure"
                className={selectClassName}
                defaultValue={defaults?.imapSecure === false ? "false" : "true"}
              >
                <option value="true">Tak (zalecane)</option>
                <option value="false">Nie</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-imap-user`}>Użytkownik</Label>
              <Input
                id={`${idPrefix}-imap-user`}
                name="imapUser"
                defaultValue={defaults?.imapUser ?? ""}
                placeholder="it@pwginfo.pl"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-imap-pass`}>Hasło</Label>
              <Input
                id={`${idPrefix}-imap-pass`}
                name="imapPassword"
                type="password"
                placeholder={
                  defaults?.hasImapPassword
                    ? "Pozostaw puste, aby nie zmieniać"
                    : "Hasło / app password"
                }
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor={`${idPrefix}-imap-mailbox`}>Folder</Label>
              <Input
                id={`${idPrefix}-imap-mailbox`}
                name="imapMailbox"
                defaultValue={defaults?.imapMailbox ?? "INBOX"}
                placeholder="INBOX"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="imapHost" value="" />
          <input type="hidden" name="imapPort" value="993" />
          <input type="hidden" name="imapUser" value="" />
          <input type="hidden" name="imapPassword" value="" />
          <input type="hidden" name="imapSecure" value="true" />
          <input type="hidden" name="imapMailbox" value="INBOX" />
        </>
      )}
    </div>
  );
}

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
      (team.inboundEmail ?? "").toLowerCase().includes(q) ||
      team.inboundType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid gap-6">
      {canManage ? (
        <form action={createAction} className="grid gap-3 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Nowy zespół</Label>
              <Input
                id="team-name"
                name="name"
                required
                maxLength={80}
                placeholder="np. IT"
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
          </div>
          <InboundFields idPrefix="team-create" />
          <Button type="submit" disabled={createPending} className="w-fit">
            <Plus />
            {createPending ? "Dodawanie..." : "Dodaj zespół"}
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
          placeholder="Szukaj po nazwie, skrzynce lub trybie..."
        />
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Nazwa</th>
              <th className="px-3 py-2 font-medium">Skrzynka</th>
              <th className="px-3 py-2 font-medium">Tryb</th>
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
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {team.description || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {team.inboundEmail || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {team.inboundType === "IMAP" ? "IMAP" : "Webhook"}
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
        <SheetContent showCloseButton className="w-full overflow-y-auto sm:max-w-lg">
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
            <InboundFields idPrefix={`team-edit-${team.id}`} defaults={team} />
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
