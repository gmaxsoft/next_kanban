export const TICKET_NOTE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const TICKET_NOTE_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const TICKET_NOTE_IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export function isAllowedTicketNoteImageMime(mimeType: string) {
  return TICKET_NOTE_IMAGE_MIME.has(mimeType);
}

export function isSafeTicketNoteImageSrc(src: string) {
  return (
    src.startsWith("/uploads/ticket-notes/") &&
    !src.includes("..") &&
    !src.includes("\\")
  );
}
