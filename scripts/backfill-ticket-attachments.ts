import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import { prisma } from "../src/lib/prisma";
import { storeTicketAttachments } from "../src/lib/ticket-attachments.server";

const LOOKBACK_DAYS = 90;

async function main() {
  const teams = await prisma.team.findMany({
    where: {
      inboundType: "IMAP",
      imapHost: { not: null },
      imapUser: { not: null },
      imapPassword: { not: null },
    },
    select: {
      id: true,
      name: true,
      imapHost: true,
      imapPort: true,
      imapUser: true,
      imapPassword: true,
      imapSecure: true,
      imapMailbox: true,
    },
  });

  let matchedMessages = 0;
  let restoredAttachments = 0;
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  for (const team of teams) {
    if (!team.imapHost || !team.imapUser || !team.imapPassword) continue;

    const client = new ImapFlow({
      host: team.imapHost,
      port: team.imapPort ?? 993,
      secure: team.imapSecure,
      auth: { user: team.imapUser, pass: team.imapPassword },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock(team.imapMailbox?.trim() || "INBOX");
      try {
        const searchResult = await client.search({ since }, { uid: true });
        const uids = Array.isArray(searchResult) ? searchResult : [];

        for (const uid of uids) {
          const message = await client.fetchOne(
            String(uid),
            { uid: true, source: true },
            { uid: true },
          );
          if (!message) continue;
          if (!message.source) continue;

          const parsed = await simpleParser(message.source);
          if (parsed.attachments.length === 0) continue;

          const messageId = parsed.messageId?.trim();
          const externalMessageId =
            messageId || `imap:${team.id}:uid:${uid}`;
          const storedMessage = await prisma.ticketMessage.findUnique({
            where: { externalMessageId },
            select: {
              id: true,
              attachments: { select: { id: true } },
            },
          });
          if (!storedMessage) continue;

          matchedMessages += 1;
          const beforeCount = storedMessage.attachments.length;
          await storeTicketAttachments(
            storedMessage.id,
            parsed.attachments.map((attachment) => ({
              filename: attachment.filename,
              contentType: attachment.contentType,
              content: attachment.content,
            })),
          );
          const afterCount = await prisma.ticketAttachment.count({
            where: { messageId: storedMessage.id },
          });
          restoredAttachments += Math.max(0, afterCount - beforeCount);
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => client.close());
    }

    console.info(`[ticket-attachments] scanned mailbox for team=${team.id}`);
  }

  console.info(
    `[ticket-attachments] matched messages=${matchedMessages}, restored attachments=${restoredAttachments}, lookback_days=${LOOKBACK_DAYS}`,
  );
}

main()
  .catch((error) => {
    console.error("[ticket-attachments] backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
