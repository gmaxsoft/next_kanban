import type { ReactNode } from "react";
import { after } from "next/server";
import { createTransport } from "nodemailer";
import { Resend } from "resend";

import { TaskAssignedEmail } from "@/emails/task-assigned";
import { TaskCommentedEmail } from "@/emails/task-commented";

function appUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function taskUrl(boardId: string, taskId: string) {
  return `${appUrl()}/boards/${boardId}/tasks/${taskId}`;
}

export function ticketUrl(ticketId: string) {
  return `${appUrl()}/tickets/${ticketId}`;
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
  return process.env.EMAIL_FROM?.trim() || "Next Kanban <onboarding@resend.dev>";
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
  const transporter = createTransport({
    host: input.smtpHost,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: input.smtpUser, pass: input.smtpPassword },
  });

  const escapedBody = input.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");

  try {
    await transporter.sendMail({
      from: `Zespół IT <${input.inboundEmail}>`,
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: input.subject,
      text: input.body,
      html: `<p>${escapedBody}</p><hr><p>Odpowiedź do zgłoszenia ${input.displayId}: ${input.subject}</p>`,
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
  const transporter = createTransport({
    host: input.smtpHost,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: input.smtpUser,
      pass: input.smtpPassword,
    },
  });
  const greeting = input.requesterName?.trim()
    ? `Dzień dobry ${input.requesterName.trim()},`
    : "Dzień dobry,";
  const emailSubject = `[${input.ticketId}] Otrzymaliśmy zgłoszenie: ${input.subject}`;

  try {
    await transporter.sendMail({
      from: `Next Kanban <${input.inboundEmail}>`,
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: emailSubject,
      text: [
        greeting,
        "",
        `Otrzymaliśmy Twoje zgłoszenie „${input.subject}”.`,
        `Numer zgłoszenia: ${input.ticketId}.`,
        "Nasz zespół IT zajmie się sprawą. Odpowiadając na tę wiadomość, pozostaw numer zgłoszenia w temacie.",
        "",
        `Podgląd zgłoszenia w Next Kanban: ${input.ticketUrl}`,
        "",
        "Pozdrawiamy,",
        "Zespół IT",
      ].join("\n"),
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
}) {
  const transporter = createTransport({
    host: input.smtpHost,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: input.smtpUser, pass: input.smtpPassword },
  });

  try {
    await transporter.sendMail({
      from: `Next Kanban <${input.inboundEmail}>`,
      to: input.toEmail,
      replyTo: input.inboundEmail,
      subject: input.subject,
      text: input.body,
    });
  } finally {
    transporter.close();
  }
}
