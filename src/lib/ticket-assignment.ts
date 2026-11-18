/**
 * Pure helpers for ticket people (assignee / requester) updates and history notes.
 */

export type TicketPeopleSnapshot = {
  assigneeId: string | null;
  assigneeName: string | null;
  requestedBy: string | null;
  requesterEmail: string;
  requesterName: string | null;
};

export function requesterDisplayLabel(input: {
  requestedBy: string | null;
  requesterName: string | null;
  requesterEmail: string;
}) {
  return (
    input.requestedBy?.trim() ||
    input.requesterName?.trim() ||
    input.requesterEmail.trim() ||
    "—"
  );
}

export function assigneeDisplayLabel(name: string | null | undefined) {
  return name?.trim() || "nieprzypisany";
}

/**
 * Validates that every requested user id is present in the allowed (active, team-scoped) set.
 * Returns missing ids — empty means OK.
 */
export function missingTeamMemberIds(
  requestedIds: string[],
  foundIds: Iterable<string>,
) {
  const found = new Set(foundIds);
  return requestedIds.filter((id) => !found.has(id));
}

/**
 * Short Polish note for conversation history when assignee and/or requester change.
 * Returns null when nothing relevant changed.
 */
export function buildPeopleChangeHistoryNote(input: {
  previous: TicketPeopleSnapshot;
  next: TicketPeopleSnapshot;
  actorName: string;
}): string | null {
  const lines: string[] = [];
  const actor = input.actorName.trim() || "System";

  const prevAssignee = input.previous.assigneeId;
  const nextAssignee = input.next.assigneeId;
  if (prevAssignee !== nextAssignee) {
    lines.push(
      `Odpowiedzialny: ${assigneeDisplayLabel(input.previous.assigneeName)} → ${assigneeDisplayLabel(input.next.assigneeName)}.`,
    );
  }

  const prevRequester = requesterDisplayLabel(input.previous);
  const nextRequester = requesterDisplayLabel(input.next);
  const prevEmail = input.previous.requesterEmail.trim().toLowerCase();
  const nextEmail = input.next.requesterEmail.trim().toLowerCase();
  if (prevRequester !== nextRequester || prevEmail !== nextEmail) {
    const emailChanged = prevEmail !== nextEmail;
    lines.push(
      emailChanged
        ? `Zgłaszający: ${prevRequester} <${input.previous.requesterEmail}> → ${nextRequester} <${input.next.requesterEmail}>.`
        : `Zgłaszający: ${prevRequester} → ${nextRequester}.`,
    );
  }

  if (lines.length === 0) {
    return null;
  }

  return `${actor} zmienił przypisanie. ${lines.join(" ")}`;
}
