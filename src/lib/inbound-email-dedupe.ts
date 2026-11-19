import { createHash } from "node:crypto";

/** Max length of TicketMessage.externalMessageId (schema VarChar(255)). */
export const EXTERNAL_MESSAGE_ID_MAX = 255;

export function inboundBodyText(input: {
  text: string | null;
  html: string | null;
}) {
  return (
    input.text?.trim() ||
    (input.html
      ? input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : "") ||
    "(brak treści)"
  );
}

/**
 * Stable content fingerprint used to tell a true delivery duplicate
 * from a reused Message-ID on a different email.
 */
export function inboundContentFingerprint(input: {
  fromEmail: string;
  subject: string | null | undefined;
  bodyText: string;
}) {
  return createHash("sha256")
    .update(
      [
        input.fromEmail.trim().toLowerCase(),
        (input.subject ?? "").trim(),
        input.bodyText.trim(),
      ].join("\0"),
      "utf8",
    )
    .digest("hex");
}

export function fingerprintsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right) {
    return false;
  }
  return left === right;
}

/**
 * When Message-ID collides across different bodies, store a deterministic
 * unique id that still dedupes re-deliveries of the same colliding mail.
 */
export function collisionExternalMessageId(
  rawExternalMessageId: string,
  contentFingerprint: string,
) {
  const suffix = `#${contentFingerprint.slice(0, 16)}`;
  const maxRaw = Math.max(1, EXTERNAL_MESSAGE_ID_MAX - suffix.length);
  return `${rawExternalMessageId.slice(0, maxRaw)}${suffix}`.slice(
    0,
    EXTERNAL_MESSAGE_ID_MAX,
  );
}

export function truncateExternalMessageId(rawExternalMessageId: string) {
  return rawExternalMessageId.slice(0, EXTERNAL_MESSAGE_ID_MAX);
}
