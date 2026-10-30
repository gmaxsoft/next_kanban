/**
 * Filtruje typowe obrazki ze stopek / podpisów maili (Outlook itd.),
 * które trafiają jako załączniki (np. image001.png, image002.png).
 */
const SIGNATURE_IMAGE_NAME =
  /^(image\d{3}|outlook-[0-9a-f-]+)\.(png|jpe?g|gif|bmp|webp)$/i;

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
