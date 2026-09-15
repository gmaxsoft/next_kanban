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

export function renderCommentWithMentions(content: string) {
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  const pattern = /(^|[\s([{"'])(@[^\s)\]},.!?;:]+(?:\s+[^\s)\]},.!?;:]+)*)/gu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const full = match[0];
    const prefix = match[1] ?? "";
    const mention = match[2] ?? "";
    const start = match.index;

    if (start > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, start) });
    }

    if (prefix) {
      parts.push({ type: "text", value: prefix });
    }

    parts.push({ type: "mention", value: mention });
    lastIndex = start + full.length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, value: content }];
}
