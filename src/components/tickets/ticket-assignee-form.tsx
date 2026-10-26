"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  updateTicketAssignee,
  type TicketActionState,
} from "@/app/actions/tickets";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";

export type TicketAssigneeOption = {
  id: string;
  name: string;
  email?: string;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const inputClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function TicketAssigneeForm({
  ticketId,
  assigneeId,
  watcherIds,
  requestedBy,
  requesterEmail,
  members,
}: {
  ticketId: string;
  assigneeId: string | null;
  watcherIds: string[];
  requestedBy: string;
  requesterEmail: string;
  members: TicketAssigneeOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState<
    TicketActionState,
    FormData
  >(updateTicketAssignee, null);
  const [isPending, startTransition] = useTransition();
  useActionToast(state);

  const pending = actionPending || isPending;

  const matchedMemberId = useMemo(() => {
    const byEmail = members.find(
      (member) =>
        member.email &&
        member.email.toLowerCase() === requesterEmail.toLowerCase(),
    );
    if (byEmail) {
      return byEmail.id;
    }

    const byName = members.find(
      (member) =>
        member.name.toLowerCase() === requestedBy.trim().toLowerCase(),
    );
    return byName?.id ?? "";
  }, [members, requesterEmail, requestedBy]);

  const [requesterUserId, setRequesterUserId] = useState(matchedMemberId);
  const [assignee, setAssignee] = useState(assigneeId ?? "");
  const [watchers, setWatchers] = useState(() => new Set(watcherIds));
  const [externalName, setExternalName] = useState(requestedBy);
  const [externalEmail, setExternalEmail] = useState(requesterEmail);

  useEffect(() => {
    setRequesterUserId(matchedMemberId);
  }, [matchedMemberId]);

  useEffect(() => {
    setAssignee(assigneeId ?? "");
  }, [assigneeId]);

  useEffect(() => {
    setWatchers(new Set(watcherIds));
  }, [watcherIds]);

  useEffect(() => {
    setExternalName(requestedBy);
    setExternalEmail(requesterEmail);
  }, [requestedBy, requesterEmail]);

  const isExternal = !requesterUserId;

  function submit(overrides: {
    requesterUserId?: string;
    assigneeId?: string;
    watcherIds?: string[];
    requestedBy?: string;
    requesterEmail?: string;
  }) {
    const nextRequesterUserId =
      overrides.requesterUserId ?? requesterUserId;
    const fd = new FormData();
    fd.set("ticketId", ticketId);
    fd.set("requesterUserId", nextRequesterUserId);
    fd.set("assigneeId", overrides.assigneeId ?? assignee);

    if (nextRequesterUserId) {
      fd.set("requestedBy", overrides.requestedBy ?? requestedBy);
    } else {
      fd.set(
        "requestedBy",
        overrides.requestedBy ?? externalName,
      );
      fd.set(
        "requesterEmail",
        overrides.requesterEmail ?? externalEmail,
      );
    }

    for (const id of overrides.watcherIds ?? [...watchers]) {
      fd.append("watcherIds", id);
    }

    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <form
      ref={formRef}
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit({});
      }}
    >
      <div className="grid gap-2 sm:max-w-lg">
        <Label htmlFor="ticket-requester-user">Zgłaszający</Label>
        <select
          id="ticket-requester-user"
          value={requesterUserId}
          disabled={pending}
          className={cn(selectClassName, pending && "opacity-60")}
          onChange={(event) => {
            const next = event.target.value;
            setRequesterUserId(next);
            if (next) {
              submit({ requesterUserId: next });
            }
          }}
        >
          <option value="">Zewnętrzny / inny e-mail…</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.email ? ` (${member.email})` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Wybór zapisuje się od razu. Odpowiedzi e-mail idą do zgłaszającego.
        </p>
      </div>

      {isExternal ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-lg">
          <div className="grid gap-2">
            <Label htmlFor="ticket-requested-by">Imię zgłaszającego</Label>
            <input
              id="ticket-requested-by"
              value={externalName}
              disabled={pending}
              maxLength={255}
              required
              className={cn(inputClassName, pending && "opacity-60")}
              onChange={(event) => setExternalName(event.target.value)}
              onBlur={() => {
                if (
                  externalName.trim() &&
                  externalEmail.trim() &&
                  (externalName !== requestedBy ||
                    externalEmail !== requesterEmail)
                ) {
                  submit({
                    requesterUserId: "",
                    requestedBy: externalName.trim(),
                    requesterEmail: externalEmail.trim(),
                  });
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ticket-requester-email">E-mail zgłaszającego</Label>
            <input
              id="ticket-requester-email"
              type="email"
              value={externalEmail}
              disabled={pending}
              maxLength={255}
              required
              className={cn(inputClassName, pending && "opacity-60")}
              onChange={(event) => setExternalEmail(event.target.value)}
              onBlur={() => {
                if (
                  externalName.trim() &&
                  externalEmail.trim() &&
                  (externalName !== requestedBy ||
                    externalEmail !== requesterEmail)
                ) {
                  submit({
                    requesterUserId: "",
                    requestedBy: externalName.trim(),
                    requesterEmail: externalEmail.trim(),
                  });
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-3">
        <div className="grid gap-2">
          <Label htmlFor="ticket-assignee">Odpowiedzialny</Label>
          <select
            id="ticket-assignee"
            value={assignee}
            disabled={pending}
            className={cn(
              "h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
              pending && "opacity-60",
            )}
            onChange={(event) => {
              const next = event.target.value;
              setAssignee(next);
              submit({ assigneeId: next });
            }}
          >
            <option value="">Nieprzypisany</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="grid min-w-60 gap-2">
          <legend className="text-sm font-medium">Obserwujący</legend>
          <div
            className={cn(
              "grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2",
              pending && "opacity-60",
            )}
          >
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={watchers.has(member.id)}
                  disabled={pending}
                  className="size-4 accent-primary"
                  onChange={(event) => {
                    const next = new Set(watchers);
                    if (event.target.checked) {
                      next.add(member.id);
                    } else {
                      next.delete(member.id);
                    }
                    setWatchers(next);
                    submit({ watcherIds: [...next] });
                  }}
                />
                <span>{member.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {pending ? (
        <p className="text-xs text-muted-foreground">Zapisywanie…</p>
      ) : null}
    </form>
  );
}
