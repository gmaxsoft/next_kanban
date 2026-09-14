export const CHAT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_UPLOAD_MAX_FILES = 5;

export const CHAT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const CHAT_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/x-rar-compressed": ".rar",
  "application/vnd.rar": ".rar",
  "text/plain": ".txt",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export type StoredChatFile = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export function isAllowedChatMime(mimeType: string) {
  return CHAT_ALLOWED_MIME_TYPES.has(mimeType);
}

export function isImageMime(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeOriginalName(name: string) {
  return name.replace(/[^\w.\- ()ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/gi, "_").slice(0, 120);
}
