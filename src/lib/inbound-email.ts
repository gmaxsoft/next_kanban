import { createHmac, timingSafeEqual } from "node:crypto";

import { Resend } from "resend";

import {
  findTeamByInboundAddress,
  formatTicketId,
  parseEmailAddress,
  parseTicketRef,
  stripTicketRef,
} from "@/lib/tickets";
import { sendTicketAcknowledgementEmail, ticketUrl } from "@/lib/mail";
import { notifyTicketParticipants } from "@/lib/ticket-notifications";
import { prisma } from "@/lib/prisma";
import {
  storeTicketAttachments,
  type IncomingTicketAttachment,
} from "@/lib/ticket-attachments.server";

/** Uniwersalny obiekt e-maila dla webhooka i IMAP. */
export type IncomingEmailInput = {
  fromEmail: string;
  fromName: string | null;
  toAddresses: string[];
  subject: string;
  text: string | null;
  html: string | null;
  messageId: string | null;
  attachments?: IncomingTicketAttachment[];
  /** Identyfikator zewnętrzny (np. Resend email_id) — używany przy deduplikacji. */
  externalId?: string | null;
};

/** @deprecated Użyj IncomingEmailInput — alias dla kompatybilności. */
export type NormalizedInboundEmail = IncomingEmailInput & {
  resendEmailId: string | null;
};

export type ProcessIncomingEmailResult = {
  ticketId: string;
  created: boolean;
  duplicate: boolean;
  taskCreated: boolean;
  acknowledgementSent: boolean;
};

export type ProcessIncomingEmailOptions = {
  /** Wymusza zespół (np. skrzynka IMAP należąca do konkretnego teamu). */
  preferredTeamId?: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

async function sendPendingTicketAcknowledgement(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      team: {
        select: {
          inboundEmail: true,
          imapHost: true,
          imapUser: true,
          imapPassword: true,
        },
      },
    },
  });

  if (!ticket || ticket.acknowledgementSentAt) {
    return false;
  }

  const team = ticket.team;
  if (
    !team?.inboundEmail ||
    !team.imapHost?.startsWith("imap.") ||
    !team.imapUser ||
    !team.imapPassword
  ) {
    return false;
  }

  if (ticket.requesterEmail.toLowerCase() === team.inboundEmail.toLowerCase()) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { acknowledgementSentAt: new Date() },
    });
    return false;
  }

  const smtpHost = team.imapHost.replace(/^imap\./i, "smtp.");
  await sendTicketAcknowledgementEmail({
    toEmail: ticket.requesterEmail,
    requesterName: ticket.requesterName,
    ticketId: formatTicketId(ticket.number),
    subject: ticket.subject,
    ticketUrl: ticketUrl(ticket.id),
    inboundEmail: team.inboundEmail,
    smtpHost,
    smtpUser: team.imapUser,
    smtpPassword: team.imapPassword,
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { acknowledgementSentAt: new Date() },
  });
  return true;
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  return apiKey ? new Resend(apiKey) : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }

  const single = asString(value);
  return single ? [single] : [];
}

export function verifySimpleWebhookSecret(request: Request) {
  const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const bearer = request.headers.get("authorization");
  const header = request.headers.get("x-webhook-secret");

  if (bearer === `Bearer ${secret}` || header === secret) {
    return true;
  }

  return false;
}

function verifySvixSignature(rawBody: string, request: Request, secret: string) {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatureHeader = request.headers.get("svix-signature");

  if (!id || !timestamp || !signatureHeader) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 60 * 5) {
    return false;
  }

  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "base64");

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");

  const candidates = signatureHeader
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  return candidates.some((candidate) => {
    try {
      const left = Buffer.from(candidate);
      const right = Buffer.from(expected);
      return left.length === right.length && timingSafeEqual(left, right);
    } catch {
      return false;
    }
  });
}

export function verifyInboundWebhook(request: Request, rawBody: string) {
  const resendSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const simpleSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET?.trim();

  if (resendSecret && request.headers.get("svix-signature")) {
    try {
      const resend = getResend();
      if (resend?.webhooks?.verify) {
        resend.webhooks.verify({
          payload: rawBody,
          headers: {
            id: request.headers.get("svix-id") ?? "",
            timestamp: request.headers.get("svix-timestamp") ?? "",
            signature: request.headers.get("svix-signature") ?? "",
          },
          webhookSecret: resendSecret,
        });
        return true;
      }
    } catch {
      // fall through to manual Svix check
    }

    if (verifySvixSignature(rawBody, request, resendSecret)) {
      return true;
    }
  }

  const simple = verifySimpleWebhookSecret(request);
  if (simple === true) {
    return true;
  }

  if (!resendSecret && !simpleSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[inbound-email] brak RESEND_WEBHOOK_SECRET / INBOUND_EMAIL_WEBHOOK_SECRET — pomijam weryfikację (dev)",
      );
      return true;
    }
  }

  return false;
}

function normalizeFlatPayload(payload: Record<string, unknown>): IncomingEmailInput | null {
  const fromRaw = asString(payload.from || payload.sender);
  const subject = asString(payload.subject);
  if (!fromRaw || !subject) {
    return null;
  }

  const parsedFrom = parseEmailAddress(fromRaw);
  const toAddresses = [
    ...asStringArray(payload.to),
    ...asStringArray(payload.recipient),
    ...asStringArray(payload.received_for),
  ];

  const externalId = asString(payload.email_id || payload.emailId) || null;

  return {
    fromEmail: parsedFrom.email,
    fromName: parsedFrom.name || asString(payload.from_name) || null,
    toAddresses,
    subject,
    text: asString(payload.text || payload.body || payload.plain) || null,
    html: asString(payload.html || payload["body-html"]) || null,
    messageId:
      asString(payload.messageId || payload.message_id || payload["Message-Id"]) ||
      null,
    externalId,
  };
}

export async function normalizeInboundPayload(
  payload: unknown,
): Promise<IncomingEmailInput | null> {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;

  if (asString(root.type) === "email.received" && root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    const emailId = asString(data.email_id);
    const fromRaw = asString(data.from);
    const subject = asString(data.subject);
    const toAddresses = [
      ...asStringArray(data.to),
      ...asStringArray(data.received_for),
    ];
    const messageId = asString(data.message_id) || null;

    let text: string | null = null;
    let html: string | null = null;
    let fromName: string | null = null;

    const resend = getResend();
    if (resend && emailId) {
      try {
        const { data: email, error } = await resend.emails.receiving.get(emailId);
        if (!error && email) {
          text = email.text ?? null;
          html = email.html ?? null;
          const headerFrom =
            email.headers && typeof email.headers === "object"
              ? asString((email.headers as Record<string, string>).from)
              : "";
          if (headerFrom) {
            fromName = parseEmailAddress(headerFrom).name;
          }
        }
      } catch (error) {
        console.error("[inbound-email] nie udało się pobrać treści Resend", error);
      }
    }

    if (!fromRaw || !subject) {
      return null;
    }

    const parsedFrom = parseEmailAddress(fromRaw);

    return {
      fromEmail: parsedFrom.email,
      fromName: fromName ?? parsedFrom.name,
      toAddresses,
      subject,
      text,
      html,
      messageId,
      externalId: emailId || null,
    };
  }

  return normalizeFlatPayload(root);
}

/**
 * Wspólna warstwa serwisowa dla webhooka i IMAP.
 * Tworzy ticket albo dopina wiadomość do istniejącego wątku `[T-n]`.
 */
export async function processIncomingEmail(
  email: IncomingEmailInput,
  options: ProcessIncomingEmailOptions = {},
): Promise<ProcessIncomingEmailResult> {
  const externalMessageId =
    email.messageId ||
    email.externalId ||
    `generated:${email.fromEmail}:${email.subject}:${email.text?.slice(0, 40) ?? ""}`;

  const existingMessage = await prisma.ticketMessage.findUnique({
    where: { externalMessageId },
    select: { id: true, ticketId: true },
  });

  if (existingMessage) {
    await storeTicketAttachments(existingMessage.id, email.attachments);
    const acknowledgementSent = await sendPendingTicketAcknowledgement(
      existingMessage.ticketId,
    );
    return {
      ticketId: existingMessage.ticketId,
      created: false,
      duplicate: true,
      taskCreated: false,
      acknowledgementSent,
    };
  }

  const ticketNumber = parseTicketRef(email.subject);
  const matchedTeam = await findTeamByInboundAddress(email.toAddresses);
  const teamId = options.preferredTeamId ?? matchedTeam?.id ?? null;

  const bodyText =
    email.text?.trim() ||
    (email.html
      ? email.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : "") ||
    "(brak treści)";

  if (ticketNumber) {
    const matchedByNumber = await prisma.ticket.findUnique({
      where: { number: ticketNumber },
      select: {
        id: true,
        status: true,
        statusLocked: true,
        mergedIntoId: true,
      },
    });

    let ticket = matchedByNumber;
    if (matchedByNumber?.mergedIntoId) {
      let currentId = matchedByNumber.mergedIntoId;
      for (let depth = 0; depth < 10; depth += 1) {
        const next = await prisma.ticket.findUnique({
          where: { id: currentId },
          select: {
            id: true,
            status: true,
            statusLocked: true,
            mergedIntoId: true,
          },
        });
        if (!next) {
          ticket = null;
          break;
        }
        if (!next.mergedIntoId) {
          ticket = next;
          break;
        }
        currentId = next.mergedIntoId;
      }
    }

    if (ticket) {
      const [createdMessage] = await prisma.$transaction([
        prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            kind: "INBOUND",
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            subject: email.subject,
            bodyText,
            bodyHtml: email.html,
            externalMessageId,
          },
        }),
        prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            lastMessageAt: new Date(),
            // Manual status stays put; otherwise reopen resolved tickets.
            ...(ticket.statusLocked
              ? {}
              : {
                  status:
                    ticket.status === "RESOLVED" ? "OPEN" : ticket.status,
                }),
          },
        }),
      ]);

      await notifyTicketParticipants({
        ticketId: ticket.id,
        title: "Nowa wiadomość w tickecie",
        body: `Otrzymano odpowiedź od ${email.fromName || email.fromEmail}.`,
      });

      if (teamId) {
        await prisma.ticket.updateMany({
          where: { id: ticket.id, teamId: null },
          data: { teamId },
        });
      }

      await storeTicketAttachments(createdMessage.id, email.attachments);

      return {
        ticketId: ticket.id,
        created: false,
        duplicate: false,
        taskCreated: false,
        acknowledgementSent: false,
      };
    }
  }

  const subject = stripTicketRef(email.subject) || email.subject;

  const created = await prisma.ticket.create({
    data: {
      subject: subject.slice(0, 255),
      requesterEmail: email.fromEmail,
      requesterName: email.fromName,
      requestedBy: email.fromName || email.fromEmail,
      teamId,
      lastMessageAt: new Date(),
      messages: {
        create: {
          kind: "INBOUND",
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          subject: email.subject.slice(0, 255),
          bodyText,
          bodyHtml: email.html,
          externalMessageId,
        },
      },
    },
    select: {
      id: true,
      number: true,
      messages: { select: { id: true } },
    },
  });

  const createdMessage = created.messages[0];
  if (createdMessage) {
    await storeTicketAttachments(createdMessage.id, email.attachments);
  }

  console.info(
    `[inbound-email] nowy ticket ${formatTicketId(created.number)} od ${email.fromEmail}`,
  );

    const acknowledgementSent = await sendPendingTicketAcknowledgement(created.id);

  return {
    ticketId: created.id,
    created: true,
    duplicate: false,
    taskCreated: false,
    acknowledgementSent,
  };
}

/** Alias kompatybilności wstecznej. */
export async function ingestInboundEmail(
  email: IncomingEmailInput | NormalizedInboundEmail,
  options?: ProcessIncomingEmailOptions,
) {
  const normalized: IncomingEmailInput = {
    fromEmail: email.fromEmail,
    fromName: email.fromName,
    toAddresses: email.toAddresses,
    subject: email.subject,
    text: email.text,
    html: email.html,
    messageId: email.messageId,
    externalId:
      email.externalId ??
      ("resendEmailId" in email ? email.resendEmailId : null) ??
      null,
  };

  return processIncomingEmail(normalized, options);
}
