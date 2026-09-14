import { cn } from "cn";

import {
  excerptFromRichText,
  isEmptyRichText,
  looksLikeHtml,
  sanitizeRichText,
} from "@/lib/rich-text";

export function RichTextContent({
  value,
  className,
  excerpt,
  excerptLength = 120,
}: {
  value?: string | null;
  className?: string;
  excerpt?: boolean;
  excerptLength?: number;
}) {
  if (!value || isEmptyRichText(value)) {
    return null;
  }

  if (excerpt) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        {excerptFromRichText(value, excerptLength)}
      </p>
    );
  }

  if (!looksLikeHtml(value)) {
    return (
      <div className={cn("whitespace-pre-wrap text-sm", className)}>{value}</div>
    );
  }

  return (
    <div
      className={cn("prose-editor text-sm", className)}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}
