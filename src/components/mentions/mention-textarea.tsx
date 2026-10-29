"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import type { BoardMember } from "@/lib/kanban";
import { getInitials } from "@/lib/user";

export function MentionTextarea({
  name,
  members,
  id,
  placeholder,
  rows = 5,
  required,
  maxLength = 10000,
  defaultValue = "",
  resetKey,
  className,
}: {
  name: string;
  members: BoardMember[];
  id?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  /** Initial text (e.g. when editing an existing note). */
  defaultValue?: string;
  /** Change this after a successful submit to reset the field. */
  resetKey?: string | number | boolean | null;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState(defaultValue);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setContent(defaultValue);
    setMentionedIds([]);
    setMentionQuery(null);
    // resetKey drives intentional resets; defaultValue is the restore target
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }

    const query = mentionQuery.toLowerCase();
    return members.filter((member) =>
      member.name.toLowerCase().includes(query),
    );
  }, [members, mentionQuery]);

  function syncMentionState(value: string, caret: number) {
    const before = value.slice(0, caret);
    const match = before.match(/(^|[\s([{"'])@([^\s@]*)$/);

    if (!match) {
      setMentionQuery(null);
      return;
    }

    setMentionQuery(match[2] ?? "");
    setActiveIndex(0);
  }

  function insertMention(member: BoardMember) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const caret = textarea.selectionStart ?? content.length;
    const before = content.slice(0, caret);
    const after = content.slice(caret);
    const match = before.match(/(^|[\s([{"'])@([^\s@]*)$/);

    if (!match) {
      return;
    }

    const start = before.length - (match[2]?.length ?? 0) - 1;
    const prefix = before.slice(0, start);
    const next = `${prefix}@${member.name} ${after}`;
    const nextCaret = `${prefix}@${member.name} `.length;

    setContent(next);
    setMentionedIds((current) =>
      current.includes(member.id) ? current : [...current, member.id],
    );
    setMentionQuery(null);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {mentionedIds.map((memberId) => (
        <input
          key={memberId}
          type="hidden"
          name="mentionedIds"
          value={memberId}
        />
      ))}
      <Textarea
        ref={textareaRef}
        id={id}
        name={name}
        required={required}
        maxLength={maxLength}
        rows={rows}
        value={content}
        placeholder={placeholder}
        onChange={(event) => {
          const value = event.target.value;
          setContent(value);
          syncMentionState(value, event.target.selectionStart ?? value.length);
        }}
        onKeyDown={(event) => {
          if (mentionQuery === null || suggestions.length === 0) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % suggestions.length);
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) =>
                (index - 1 + suggestions.length) % suggestions.length,
            );
            return;
          }

          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            insertMention(suggestions[activeIndex] ?? suggestions[0]!);
            return;
          }

          if (event.key === "Escape") {
            setMentionQuery(null);
          }
        }}
        onClick={(event) => {
          const target = event.currentTarget;
          syncMentionState(
            target.value,
            target.selectionStart ?? target.value.length,
          );
        }}
        onKeyUp={(event) => {
          const target = event.currentTarget;
          syncMentionState(
            target.value,
            target.selectionStart ?? target.value.length,
          );
        }}
      />

      {mentionQuery !== null ? (
        <ul className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md sm:max-w-sm">
          {suggestions.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              Brak użytkowników do wzmianki
            </li>
          ) : (
            suggestions.map((member, index) => (
              <li key={member.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    index === activeIndex ? "bg-muted" : "hover:bg-muted/70"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(member);
                  }}
                >
                  <Avatar size="sm" className="size-6">
                    <AvatarImage
                      src={member.avatarUrl ?? undefined}
                      alt={member.name}
                    />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
