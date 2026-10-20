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

  if (parts.length > 1) {
    const last = parts[parts.length - 1];
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
