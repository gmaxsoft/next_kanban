import DOMPurify from "isomorphic-dompurify";

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

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function isEmptyRichText(value: string | null | undefined) {
  if (!value) {
    return true;
  }

  const text = plainTextFromHtml(value);
  return text.length === 0;
}

export function sanitizeRichText(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim();
}

export function normalizeRichTextInput(value: string) {
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
    );
  }

  return sanitizeRichText(trimmed);
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
