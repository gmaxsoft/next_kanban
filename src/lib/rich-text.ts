import DOMPurify from "isomorphic-dompurify";

import { isSafeTicketNoteImageSrc } from "@/lib/ticket-note-images";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "blockquote",
  "code",
  "pre",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

export type SanitizeRichTextOptions = {
  allowImages?: boolean;
};

function stripUnsafeImages(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const src = srcMatch?.[2]?.trim() ?? "";
    if (!isSafeTicketNoteImageSrc(src)) {
      return "";
    }
    const altMatch = tag.match(/\balt\s*=\s*(["'])(.*?)\1/i);
    const alt = (altMatch?.[2] ?? "").replace(/[<>&"]/g, "");
    return `<img src="${src}" alt="${alt}">`;
  });
}

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function isEmptyRichText(value: string | null | undefined) {
  if (!value) {
    return true;
  }

  const text = plainTextFromHtml(value);
  if (text.length > 0) {
    return false;
  }

  return !/<img\b/i.test(value);
}

export function sanitizeRichText(
  html: string,
  options: SanitizeRichTextOptions = {},
) {
  const allowImages = Boolean(options.allowImages);
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowImages ? [...ALLOWED_TAGS, "img"] : ALLOWED_TAGS,
    ALLOWED_ATTR: allowImages
      ? [...ALLOWED_ATTR, "src", "alt"]
      : ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim();

  return allowImages ? stripUnsafeImages(cleaned).trim() : cleaned;
}

export function normalizeRichTextInput(
  value: string,
  options: SanitizeRichTextOptions = {},
) {
  const trimmed = value.trim();
  if (!trimmed || isEmptyRichText(trimmed)) {
    return "";
  }

  if (!looksLikeHtml(trimmed)) {
    const escaped = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return sanitizeRichText(
      escaped
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
        .join(""),
      options,
    );
  }

  return sanitizeRichText(trimmed, options);
}

export function plainTextFromHtml(value: string) {
  if (!value) {
    return "";
  }

  const source = looksLikeHtml(value) ? sanitizeRichText(value) : value;
  return source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function excerptFromRichText(value: string, max = 120) {
  const text = plainTextFromHtml(value);
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
