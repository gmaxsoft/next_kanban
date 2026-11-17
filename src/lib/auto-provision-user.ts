import { createHash, randomBytes } from "node:crypto";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { BIURO_TEAM_ID, SYSTEM_RESTRICTED_ROLE_ID } from "@/lib/rbac";
import { sendAccountActivationEmail } from "@/lib/mail";

/**
 * Only these sender domains may get an auto-created RESTRICTED account
 * from inbound HelpDesk mail (spam protection).
 * Includes both common spellings used by the organisation.
 */
export const AUTO_PROVISION_EMAIL_DOMAINS = [
  "pwg.info.pl",
  "pwginfo.pl",
] as const;

const ACTIVATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 0) {
    return "";
  }
  return email.slice(at + 1).trim().toLowerCase();
}

export function isAutoProvisionEmailDomain(email: string) {
  const domain = emailDomain(email);
  return (AUTO_PROVISION_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function displayNameFromInbound(email: string, name: string | null) {
  const trimmed = name?.trim();
  if (trimmed && trimmed.length >= 2) {
    return trimmed.slice(0, 80);
  }

  const local = email.split("@")[0] ?? "Użytkownik";
  const pretty = local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  return (pretty || "Użytkownik").slice(0, 80);
}

function issueActivationToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashActivationToken(token),
    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
  };
}

/**
 * Creates (or refreshes) a pending RESTRICTED account for an inbound sender
 * from an allowed domain. No-op for other domains / already active users.
 */
export async function maybeAutoProvisionUserFromInbound(input: {
  email: string;
  name: string | null;
  teamId: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !isAutoProvisionEmailDomain(email)) {
    return { provisioned: false as const, reason: "domain" as const };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      isActive: true,
      activationTokenExpiresAt: true,
      teamId: true,
    },
  });

  if (existing?.isActive) {
    return { provisioned: false as const, reason: "already-active" as const };
  }

  // Pending invite still valid — do not spam activation mails on every inbound.
  if (
    existing &&
    !existing.isActive &&
    existing.activationTokenExpiresAt &&
    existing.activationTokenExpiresAt.getTime() > Date.now()
  ) {
    return { provisioned: false as const, reason: "pending" as const };
  }

  const activation = issueActivationToken();
  const placeholderPassword = await hashPassword(randomBytes(32).toString("hex"));
  const name = displayNameFromInbound(email, input.name);

  const restrictedRole = await prisma.appRole.findUnique({
    where: { id: SYSTEM_RESTRICTED_ROLE_ID },
    select: { id: true },
  });

  if (!restrictedRole) {
    console.error(
      "[auto-provision] brak roli RESTRICTED — pominięto tworzenie konta",
    );
    return { provisioned: false as const, reason: "missing-role" as const };
  }

  // Membership is always Biuro; SMTP for activation still uses the mailbox team.
  const mailboxTeamId = input.teamId;
  const mailboxTeam = mailboxTeamId
    ? await prisma.team.findUnique({
        where: { id: mailboxTeamId },
        select: {
          id: true,
          inboundEmail: true,
          imapHost: true,
          imapUser: true,
          imapPassword: true,
        },
      })
    : null;

  const biuroTeam = await prisma.team.findUnique({
    where: { id: BIURO_TEAM_ID },
    select: { id: true },
  });
  const userTeamId = biuroTeam?.id ?? null;
  if (!biuroTeam) {
    console.warn(
      "[auto-provision] brak zespołu Biuro — konto bez teamId",
    );
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          roleId: restrictedRole.id,
          teamId: userTeamId,
          isActive: false,
          passwordHash: placeholderPassword,
          activationTokenHash: activation.tokenHash,
          activationTokenExpiresAt: activation.expiresAt,
        },
        select: { id: true, email: true, name: true },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          roleId: restrictedRole.id,
          teamId: userTeamId,
          isActive: false,
          passwordHash: placeholderPassword,
          activationTokenHash: activation.tokenHash,
          activationTokenExpiresAt: activation.expiresAt,
        },
        select: { id: true, email: true, name: true },
      });

  const canSendSmtp =
    Boolean(mailboxTeam?.inboundEmail) &&
    Boolean(mailboxTeam?.imapHost?.startsWith("imap.")) &&
    Boolean(mailboxTeam?.imapUser) &&
    Boolean(mailboxTeam?.imapPassword);

  let emailSent = false;
  if (
    canSendSmtp &&
    mailboxTeam?.inboundEmail &&
    mailboxTeam.imapHost &&
    mailboxTeam.imapUser &&
    mailboxTeam.imapPassword
  ) {
    try {
      await sendAccountActivationEmail({
        toEmail: user.email,
        userName: user.name,
        activationToken: activation.token,
        inboundEmail: mailboxTeam.inboundEmail,
        smtpHost: mailboxTeam.imapHost.replace(/^imap\./i, "smtp."),
        smtpUser: mailboxTeam.imapUser,
        smtpPassword: mailboxTeam.imapPassword,
      });
      emailSent = true;
    } catch (error) {
      console.error(
        `[auto-provision] SMTP aktywacji nie powiódł się dla ${user.email}`,
        error,
      );
    }
  } else {
    console.warn(
      `[auto-provision] konto ${user.email} utworzone, ale brak SMTP zespołu (IMAP) — mail aktywacyjny nie wysłany`,
    );
  }

  console.info(
    `[auto-provision] konto RESTRICTED dla ${user.email}` +
      (emailSent ? " (aktywacja wysłana SMTP)" : " (bez maila)"),
  );

  return {
    provisioned: true as const,
    userId: user.id,
    refreshed: Boolean(existing),
    emailSent,
  };
}
