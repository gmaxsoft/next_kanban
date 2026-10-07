import { renderCommentWithMentions } from "@/lib/mentions";

export function MentionBody({ content }: { content: string }) {
  const parts = renderCommentWithMentions(content);

  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <span
            key={`${part.value}-${index}`}
            className="rounded bg-primary/10 px-0.5 font-medium text-primary"
          >
            {part.value}
          </span>
        ) : (
          <span key={`${index}-${part.value.slice(0, 8)}`}>{part.value}</span>
        ),
      )}
    </p>
  );
}
