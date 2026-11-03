import type { Editor } from "@tiptap/react";

export type EditorMentionMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type ActiveMentionQuery = {
  query: string;
  from: number;
  to: number;
};

const MENTION_TRIGGER =
  /(^|[\s([{"'])@([^\s@]*)$/;

export function getActiveMentionQuery(
  editor: Editor,
): ActiveMentionQuery | null {
  const { from } = editor.state.selection;
  const $from = editor.state.selection.$from;
  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 80),
    $from.parentOffset,
    undefined,
    "\ufffc",
  );
  const match = textBefore.match(MENTION_TRIGGER);
  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  return {
    query,
    from: from - query.length - 1,
    to: from,
  };
}

export function filterMentionMembers(
  members: EditorMentionMember[],
  query: string,
) {
  const normalized = query.toLowerCase();
  return members.filter((member) =>
    member.name.toLowerCase().includes(normalized),
  );
}

export function insertEditorMention(
  editor: Editor,
  member: EditorMentionMember,
  active: ActiveMentionQuery,
) {
  editor
    .chain()
    .focus()
    .deleteRange({ from: active.from, to: active.to })
    .insertContent(`@${member.name} `)
    .run();
}
