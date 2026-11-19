export type MentionMember = {
  id: string;
  name: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionAliases(
  member: MentionMember,
  members: MentionMember[],
): string[] {
  const aliases = [member.name.trim()];
  const parts = member.name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 1) {
    const first = parts[0]!;
    const firstMatches = members.filter((candidate) => {
      const candidateParts = candidate.name.trim().split(/\s+/).filter(Boolean);
      return candidateParts[0]?.toLowerCase() === first.toLowerCase();
    });
    if (firstMatches.length === 1 && first.toLowerCase() !== aliases[0]!.toLowerCase()) {
      aliases.push(first);
    }
  }

  if (parts.length > 1) {
    const last = parts[parts.length - 1]!;
    const lastMatches = members.filter((candidate) => {
      const candidateParts = candidate.name.trim().split(/\s+/).filter(Boolean);
      return (
        candidateParts[candidateParts.length - 1]?.toLowerCase() ===
        last.toLowerCase()
      );
    });

    if (lastMatches.length === 1) {
      aliases.push(last);
    }
  }

  return aliases;
}

/**
 * Earliest @mention in content order (full name, unique first, or unique last).
 * Used by notes / comments — not for inbound email auto-assign.
 */
export function findFirstMentionedUserId(
  content: string,
  members: MentionMember[],
): string | null {
  if (!content.trim() || members.length === 0) {
    return null;
  }

  const candidates = members
    .flatMap((member) =>
      mentionAliases(member, members).map((alias) => ({
        id: member.id,
        alias,
      })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);

  let best: { id: string; index: number } | null = null;

  for (const candidate of candidates) {
    const pattern = new RegExp(
      `(^|[\\s([{\"'])@${escapeRegExp(candidate.alias)}(?=$|[\\s)\\]},.!?;:])`,
      "giu",
    );
    const match = pattern.exec(content);
    if (!match) {
      continue;
    }
    const atIndex = match.index + (match[1] ? match[1].length : 0);
    if (!best || atIndex < best.index) {
      best = { id: candidate.id, index: atIndex };
    }
  }

  return best?.id ?? null;
}

export type InboundAssigneeMember = {
  id: string;
  email: string;
};

function emailLocalPart(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) {
    return "";
  }
  return email.slice(0, at).trim().toLowerCase();
}

/**
 * Inbound-only assignee detection: `@user@domain` or unique `@local-part`.
 * First-name mentions like `@Grzegorz` are intentionally ignored.
 */
export function findFirstInboundAssigneeUserId(
  content: string,
  members: InboundAssigneeMember[],
): string | null {
  if (!content.trim() || members.length === 0) {
    return null;
  }

  const normalized = members
    .map((member) => ({
      id: member.id,
      email: member.email.trim().toLowerCase(),
      local: emailLocalPart(member.email),
    }))
    .filter((member) => member.email.includes("@") && member.local);

  if (normalized.length === 0) {
    return null;
  }

  const localCounts = new Map<string, number>();
  for (const member of normalized) {
    localCounts.set(member.local, (localCounts.get(member.local) ?? 0) + 1);
  }

  const candidates = normalized
    .flatMap((member) => {
      const aliases = [member.email];
      if ((localCounts.get(member.local) ?? 0) === 1) {
        aliases.push(member.local);
      }
      return aliases.map((alias) => ({ id: member.id, alias }));
    })
    .sort((a, b) => b.alias.length - a.alias.length);

  let best: { id: string; index: number } | null = null;

  for (const candidate of candidates) {
    const pattern = new RegExp(
      `(^|[\\s([{\"'])@${escapeRegExp(candidate.alias)}(?=$|[\\s)\\]},.!?;:])`,
      "giu",
    );
    const match = pattern.exec(content);
    if (!match) {
      continue;
    }
    const atIndex = match.index + (match[1] ? match[1].length : 0);
    if (!best || atIndex < best.index) {
      best = { id: candidate.id, index: atIndex };
    }
  }

  return best?.id ?? null;
}

export function extractMentionedUserIds(
  content: string,
  members: MentionMember[],
  explicitIds: string[] = [],
) {
  const ids = new Set(
    explicitIds.filter((id) => members.some((member) => member.id === id)),
  );

  const candidates = members
    .flatMap((member) =>
      mentionAliases(member, members).map((alias) => ({
        id: member.id,
        alias,
      })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const candidate of candidates) {
    const pattern = new RegExp(
      `(^|[\\s([{\"'])@${escapeRegExp(candidate.alias)}(?=$|[\\s)\\]},.!?;:])`,
      "giu",
    );

    if (pattern.test(content)) {
      ids.add(candidate.id);
    }
  }

  return [...ids];
}

export function renderCommentWithMentions(
  content: string,
  members: MentionMember[] = [],
) {
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let lastIndex = 0;
  const candidates = members
    .flatMap((member) =>
      mentionAliases(member, members).map((alias) => ({ alias })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);

  for (let index = 0; index < content.length; index += 1) {
    if (
      content[index] !== "@" ||
      (index > 0 && !/[\s([{"']/.test(content[index - 1]))
    ) {
      continue;
    }

    const candidate = candidates.find(({ alias }) => {
      const end = index + 1 + alias.length;
      const afterAlias = content[end];
      return (
        content.slice(index + 1, end).toLowerCase() === alias.toLowerCase() &&
        (afterAlias === undefined || /[\s)\]},.!?;:]/.test(afterAlias))
      );
    });

    if (!candidate) continue;

    if (index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, index) });
    }

    const mentionEnd = index + 1 + candidate.alias.length;
    parts.push({
      type: "mention",
      value: content.slice(index, mentionEnd),
    });
    lastIndex = mentionEnd;
    index = mentionEnd - 1;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, value: content }];
}
