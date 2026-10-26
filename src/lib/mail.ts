import type { ReactElement, ReactNode } from "react";
import { after } from "next/server";
import { render } from "@react-email/render";
import { createTransport } from "nodemailer";
import { Resend } from "resend";

import { HelpdeskNotificationEmail } from "@/emails/helpdesk-notification";
import { TaskAssignedEmail } from "@/emails/task-assigned";
import { TaskCommentedEmail } from "@/emails/task-commented";
import { TicketAcknowledgedEmail } from "@/emails/ticket-acknowledged";
import { TicketReplyEmail } from "@/emails/ticket-reply";
import { TicketStatusChangedEmail } from "@/emails/ticket-status-changed";

function appUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function taskUrl(boardId: string, taskId: string) {
  return `${appUrl()}/boards/${boardId}/tasks/${taskId}`;
}

export function ticketUrl(ticketId: string) {
  return `${appUrl()}/tickets/${ticketId}`;
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

function getClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function fromAddress() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) {
    // Prefer HelpDesk branding if env still says Next Kanban.
    return configured.replace(/^Next Kanban\b/i, "HelpDesk");
  }
  return "HelpDesk <onboarding@resend.dev>";
}

function helpdeskFrom(inboundEmail: string) {
  return `HelpDesk <${inboundEmail}>`;
}

function scheduleMail(work: () => Promise<void>) {
  after(async () => {
    try {
      await work();
    } catch (error) {
      console.error("[mail] wysyłka nie powiodła się", error);
    }
  });
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

async function sendReactEmail({
  to,
  subject,
  react,
  replyTo,
}: {
  to: string;
  subject: string;
  react: ReactNode;
  replyTo?: string;
}) {
  const resend = getClient();

  if (!resend) {
    console.info(
      `[mail] pominięto „${subject}” do ${to} — brak RESEND_API_KEY`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject,
    react,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    console.error("[mail] Resend odrzucił wiadomość", error);
  }
}

export function notifyTaskAssigned(input: {
  toEmail: string;
  assigneeName: string;
  actorName: string;
  taskTitle: string;
  boardTitle: string;
  boardId: string;
  taskId: string;
}) {
  scheduleMail(async () => {
    await sendReactEmail({
      to: input.toEmail,
      subject: `Przypisano Cię do zadania: ${input.taskTitle}`,
      react: TaskAssignedEmail({
        assigneeName: input.assigneeName,
        actorName: input.actorName,
        taskTitle: input.taskTitle,
        boardTitle: input.boardTitle,
        taskUrl: taskUrl(input.boardId, input.taskId),
      }),
    });
  });
}

export function notifyTaskCommented(input: {
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
  scheduleMail(async () => {
    await sendReactEmail({
      to: input.toEmail,
      subject: input.mentioned
        ? `Wspomniano Cię w komentarzu: ${input.taskTitle}`
        : `Nowy komentarz w zadaniu: ${input.taskTitle}`,
      react: TaskCommentedEmail({
        assigneeName: input.assigneeName,
        actorName: input.actorName,
        taskTitle: input.taskTitle,
        boardTitle: input.boardTitle,
        commentExcerpt: excerpt(input.comment),
        taskUrl: taskUrl(input.boardId, input.taskId),
        mentioned: input.mentioned,
      }),
    });
  });
}

export async function sendTicketReplyEmail(input: {
  toEmail: string;
  requesterName: string | null;
  agentName: string;
  ticketId: string;
  displayId: string;
  subject: string;
  body: string;
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
