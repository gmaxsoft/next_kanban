import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import {
  processIncomingEmail,
  type IncomingEmailInput,
} from "@/lib/inbound-email";
import { parseEmailAddress } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

export type ImapTeamConfig = {
  id: string;
  name: string;
  inboundEmail: string | null;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapSecure: boolean;
  imapMailbox: string;
};

export type ImapMailboxResult = {
  teamId: string;
  teamName: string;
  fetched: number;
  created: number;
  appended: number;
  duplicates: number;
  errors: string[];
};

function addressesFromParsed(
  value: unknown,
): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => addressesFromParsed(entry));
  }

  if (typeof value === "object") {
    const obj = value as {
      value?: Array<{ address?: string | null }> | null;
      text?: string;
    };

    if (Array.isArray(obj.value)) {
      return obj.value
        .map((entry) => entry.address?.toLowerCase() ?? "")
        .filter(Boolean);
    }

    if (typeof obj.text === "string") {
      return obj.text
        .split(",")
        .map((part) => parseEmailAddress(part).email)
        .filter(Boolean);
    }
  }

  return [];
}

export async function listImapTeams(): Promise<ImapTeamConfig[]> {
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
      inboundEmail: true,
      imapHost: true,
      imapPort: true,
      imapUser: true,
      imapPassword: true,
      imapSecure: true,
      imapMailbox: true,
    },
  });

  return teams
    .filter(
      (team): team is typeof team & {
        imapHost: string;
        imapUser: string;
        imapPassword: string;
      } => Boolean(team.imapHost && team.imapUser && team.imapPassword),
    )
    .map((team) => ({
      id: team.id,
      name: team.name,
      inboundEmail: team.inboundEmail,
      imapHost: team.imapHost,
      imapPort: team.imapPort ?? 993,
      imapUser: team.imapUser,
      imapPassword: team.imapPassword,
      imapSecure: team.imapSecure,
      imapMailbox: team.imapMailbox?.trim() || "INBOX",
    }));
}

export async function fetchUnreadFromImapMailbox(
  team: ImapTeamConfig,
): Promise<ImapMailboxResult> {
  const result: ImapMailboxResult = {
    teamId: team.id,
    teamName: team.name,
    fetched: 0,
    created: 0,
    appended: 0,
    duplicates: 0,
    errors: [],
  };

  const client = new ImapFlow({
    host: team.imapHost,
    port: team.imapPort,
    secure: team.imapSecure,
    auth: {
      user: team.imapUser,
      pass: team.imapPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(team.imapMailbox);

    try {
      for await (const message of client.fetch(
        { seen: false },
        {
          uid: true,
          source: true,
        },
      )) {
        result.fetched += 1;
        const uid = message.uid;

        try {
          if (!message.source) {
            result.errors.push(`UID ${uid}: brak źródła wiadomości`);
            continue;
          }

          const parsed = await simpleParser(message.source);
          const fromEmail =
            parsed.from?.value?.[0]?.address?.toLowerCase() ||
            (parsed.from?.text
              ? parseEmailAddress(parsed.from.text).email
              : "");

          if (!fromEmail) {
            result.errors.push(`UID ${uid}: brak nadawcy`);
            await client.messageFlagsAdd({ uid }, ["\\Seen"]);
            continue;
          }

          const fromName =
            parsed.from?.value?.[0]?.name ||
            (parsed.from?.text
              ? parseEmailAddress(parsed.from.text).name
              : null);

          const toAddresses = [
            ...addressesFromParsed(parsed.to),
            ...addressesFromParsed(parsed.cc),
            ...(team.inboundEmail ? [team.inboundEmail.toLowerCase()] : []),
          ];

          const messageId = parsed.messageId?.trim() || null;
          const email: IncomingEmailInput = {
            fromEmail,
            fromName: fromName || null,
            toAddresses: [...new Set(toAddresses)],
            subject: parsed.subject?.trim() || "(bez tematu)",
            text: parsed.text?.trim() || null,
            html: typeof parsed.html === "string" ? parsed.html : null,
            messageId,
            externalId: messageId
              ? null
              : `imap:${team.id}:uid:${uid}`,
          };

          const processed = await processIncomingEmail(email, {
            preferredTeamId: team.id,
          });

          if (processed.duplicate) {
            result.duplicates += 1;
          } else if (processed.created) {
            result.created += 1;
          } else {
            result.appended += 1;
          }

          // Oznacz jako przeczytane, żeby kolejny cron nie pobrał ponownie
          await client.messageFlagsAdd({ uid }, ["\\Seen"]);
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : "nieznany błąd";
          result.errors.push(`UID ${uid}: ${detail}`);
          console.error(`[imap] team=${team.id} uid=${uid}`, error);
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "błąd połączenia";
    result.errors.push(detail);
    console.error(`[imap] connect/fetch failed team=${team.id}`, error);
  } finally {
    try {
      await client.logout();
    } catch {
      try {
        client.close();
      } catch {
        // ignore close errors
      }
    }
  }

  return result;
}

export async function pollAllImapInboxes(): Promise<{
  mailboxes: ImapMailboxResult[];
  totals: {
    teams: number;
    fetched: number;
    created: number;
    appended: number;
    duplicates: number;
    errors: number;
  };
}> {
  const teams = await listImapTeams();
  const mailboxes: ImapMailboxResult[] = [];

  for (const team of teams) {
    mailboxes.push(await fetchUnreadFromImapMailbox(team));
  }

  return {
    mailboxes,
    totals: {
      teams: teams.length,
      fetched: mailboxes.reduce((sum, item) => sum + item.fetched, 0),
      created: mailboxes.reduce((sum, item) => sum + item.created, 0),
      appended: mailboxes.reduce((sum, item) => sum + item.appended, 0),
      duplicates: mailboxes.reduce((sum, item) => sum + item.duplicates, 0),
      errors: mailboxes.reduce((sum, item) => sum + item.errors.length, 0),
    },
  };
}
