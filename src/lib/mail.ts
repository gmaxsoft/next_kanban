import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { createTransport } from "nodemailer";

import { AccountActivationEmail } from "@/emails/account-activation";
import { HelpdeskNotificationEmail } from "@/emails/helpdesk-notification";
import { TaskCommentedEmail } from "@/emails/task-commented";
import { TicketAcknowledgedEmail } from "@/emails/ticket-acknowledged";
import { TicketReplyEmail } from "@/emails/ticket-reply";
import { TicketStatusChangedEmail } from "@/emails/ticket-status-changed";
import { prisma } from "@/lib/prisma";

function appUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function taskUrl(boardId: string, taskId: string) {
  return `${appUrl()}/boards/${boardId}/tasks/${taskId}`;
}

export function ticketUrl(ticketId: string) {
  return `${appUrl()}/tickets/${ticketId}`;
}

export function accountActivationUrl(token: string) {
  return `${appUrl()}/activate?token=${encodeURIComponent(token)}`;
}

export function absoluteAppUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appUrl()}${normalized}`;
}

export function excerpt(value: string, max = 240) {
  const trimmed = value.trim();

  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, max - 1)}…`;
}

function helpdeskFrom(inboundEmail: string) {
  return `HelpDesk <${inboundEmail}>`;
}

async function renderEmail(react: ReactElement) {
  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ]);
  return { html, text };
}

function createSmtpTransport(input: {
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
}) {
  return createTransport({
    host: input.smtpHost,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: input.smtpUser, pass: input.smtpPassword },
  });
}

type TeamSmtp = {
  inboundEmail: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
};

async function teamSmtpForBoard(boardId: string): Promise<TeamSmtp | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
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

  const team = board?.team;
  if (
    !team?.inboundEmail ||
    !team.imapHost?.startsWith("imap.") ||
    !team.imapUser ||
    !team.imapPassword
  ) {
    return null;
  }

  return {
    inboundEmail: team.inboundEmail,
    smtpHost: team.imapHost.replace(/^imap\./i, "smtp."),
    smtpUser: team.imapUser,
    smtpPassword: team.imapPassword,
  };
}

/** Mention / comment mail for users outside the assignee/watcher set. */
export async function notifyTaskCommented(input: {
  toEmail: string;
  assigneeName: string;
  actorName: string;
  taskTitle: string;
  boardTitle: string;
  comment: string;
  boardId: string;
  taskId: string;
  mentioned?: boolean;
}) {
  const smtp = await teamSmtpForBoard(input.boardId);
  if (!smtp) {
    console.info(
      `[mail] pominięto komentarz do ${input.toEmail} — brak SMTP zespołu`,
    );
    return;
  }

  const transporter = createSmtpTransport(smtp);
  const { html, text } = await renderEmail(
    TaskCommentedEmail({
      assigneeName: input.assigneeName,
      actorName: input.actorName,
      taskTitle: input.taskTitle,
      boardTitle: input.boardTitle,
      commentExcerpt: excerpt(input.comment),
      taskUrl: taskUrl(input.boardId, input.taskId),
      mentioned: input.mentioned,
    }),
  );

  try {
    await transporter.sendMail({
      from: helpdeskFrom(smtp.inboundEmail),
      to: input.toEmail,
      replyTo: smtp.inboundEmail,
      subject: input.mentioned
        ? `Wspomniano Cię w komentarzu: ${input.taskTitle}`
        : `Nowy komentarz w zadaniu: ${input.taskTitle}`,
      text,
      html,
    });
  } finally {
    transporter.close();
  }
}

export async function sendTicketReplyEmail(input: {
  toEmail: string;
  requesterName: string | null;
  agentName: string;
  ticketId: string;
  displayId: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  inboundEmail: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
}) {
  const transporter = createSmtpTransport(input);
  const href = ticketUrl(input.ticketId);
  const { html, text } = await renderEmail(
    TicketReplyEmail({
      requesterName: input.requesterName ?? "",
      agentName: input.agentName,
      displayId: input.displayId,
      subject: input.subject,
      body: input.body,
      bodyHtml: input.bodyHtml,
      ticketUrl: href,
    }),
  );

  try {
    await transporter.sendMail({
      from: helpdeskFrom(input.inboundEmail),
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: input.subject,
      text,
      html,
    });
  } finally {
    transporter.close();
  }
}

export async function sendTicketAcknowledgementEmail(input: {
  toEmail: string;
  requesterName: string | null;
  ticketId: string;
  subject: string;
  ticketUrl: string;
  inboundEmail: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
}) {
  const transporter = createSmtpTransport(input);
  const { html, text } = await renderEmail(
    TicketAcknowledgedEmail({
      requesterName: input.requesterName,
      displayId: input.ticketId,
      subject: input.subject,
      ticketUrl: input.ticketUrl,
    }),
  );
  const emailSubject = `[${input.ticketId}] Otrzymaliśmy zgłoszenie: ${input.subject}`;

  try {
    await transporter.sendMail({
      from: helpdeskFrom(input.inboundEmail),
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: emailSubject,
      text,
      html,
    });
  } finally {
    transporter.close();
  }
}

export async function sendTicketStatusChangedEmail(input: {
  toEmail: string;
  requesterName: string | null;
  displayId: string;
  subject: string;
  statusLabel: string;
  ticketId: string;
  inboundEmail: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
}) {
  const transporter = createSmtpTransport(input);
  const href = ticketUrl(input.ticketId);
  const { html, text } = await renderEmail(
    TicketStatusChangedEmail({
      requesterName: input.requesterName,
      displayId: input.displayId,
      subject: input.subject,
      statusLabel: input.statusLabel,
      ticketUrl: href,
    }),
  );

  try {
    await transporter.sendMail({
      from: helpdeskFrom(input.inboundEmail),
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: `[${input.displayId}] Status: ${input.statusLabel}`,
      text,
      html,
    });
  } finally {
    transporter.close();
  }
}

export async function sendAccountActivationEmail(input: {
  toEmail: string;
  userName: string;
  activationToken: string;
  inboundEmail: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
}) {
  const transporter = createSmtpTransport(input);
  const activationUrl = accountActivationUrl(input.activationToken);
  const { html, text } = await renderEmail(
    AccountActivationEmail({
      userName: input.userName,
      activationUrl,
    }),
  );

  try {
    await transporter.sendMail({
      from: helpdeskFrom(input.inboundEmail),
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: "Aktywuj konto HelpDesk i ustaw hasło",
      text,
      html,
    });
  } finally {
    transporter.close();
  }
}

export async function sendTeamNotificationEmail(input: {
  toEmail: string;
  inboundEmail: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
  subject: string;
  body: string;
  recipientName?: string | null;
  actionUrl: string;
  actionLabel?: string;
  ticketDisplayId?: string;
  ticketSubject?: string;
}) {
  const transporter = createSmtpTransport(input);
  const actionUrl = absoluteAppUrl(input.actionUrl);
  const { html, text } = await renderEmail(
    HelpdeskNotificationEmail({
      recipientName: input.recipientName,
      title: input.subject,
      body: input.body,
      actionUrl,
      actionLabel: input.actionLabel,
      ticketDisplayId: input.ticketDisplayId,
      ticketSubject: input.ticketSubject,
    }),
  );

  try {
    await transporter.sendMail({
      from: helpdeskFrom(input.inboundEmail),
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: input.subject,
      text,
      html,
    });
  } finally {
    transporter.close();
  }
}
