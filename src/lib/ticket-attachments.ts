/** Limits shared by UI + server for outbound/note uploads. */
export const TICKET_UPLOAD_MAX_FILES = 20;
export const TICKET_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const TICKET_UPLOAD_MAX_MESSAGE_BYTES = 40 * 1024 * 1024;

export const TICKET_UPLOAD_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.zip,.txt,application/pdf,image/*,application/zip";

/**
 * Filtruje obrazki ze stopek / podpisów maili (Outlook itd.).
 * Tylko image001–image004 — wyższe numery (np. image005.png) mogą być
 * prawdziwymi załącznikami od użytkownika.
 */
const SIGNATURE_IMAGE_NAME =
  /^(image00[1-4]|outlook-[0-9a-f-]+)\.(png|jpe?g|gif|bmp|webp)$/i;

export function isEmailSignatureNoiseAttachment(input: {
  filename?: string | null;
  originalName?: string | null;
  contentType?: string | null;
  mimeType?: string | null;
}): boolean {
  const rawName = (input.filename ?? input.originalName ?? "").trim();
  if (!rawName) return false;

  const baseName = rawName.replace(/\\/g, "/").split("/").pop() ?? rawName;
  if (!SIGNATURE_IMAGE_NAME.test(baseName)) {
    return false;
  }

  const mime =
    (input.contentType ?? input.mimeType)?.split(";")[0]?.trim().toLowerCase() ||
    "";

  // Nazwy Outlooka dotyczą obrazów; przy braku MIME i tak odfiltruj po nazwie.
  if (mime && !mime.startsWith("image/")) {
    return false;
  }

  return true;
}

export function withoutEmailSignatureNoiseAttachments<
  T extends {
    filename?: string | null;
    originalName?: string | null;
    contentType?: string | null;
    mimeType?: string | null;
  },
>(attachments: T[]): T[] {
  return attachments.filter(
    (attachment) => !isEmailSignatureNoiseAttachment(attachment),
  );
}
