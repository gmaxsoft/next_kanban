import type { ReactNode } from "react";
import { after } from "next/server";
import { Resend } from "resend";

import { TaskAssignedEmail } from "@/emails/task-assigned";
import { TaskCommentedEmail } from "@/emails/task-commented";
import { TicketReplyEmail } from "@/emails/ticket-reply";

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

export function notifyTicketMentioned(input: {
  toEmail: string;
  recipientName: string;
  actorName: string;
  displayId: string;
  subject: string;
  comment: string;
  ticketId: string;
  context: "reply" | "note";
}) {
  scheduleMail(async () => {
    await sendReactEmail({
      to: input.toEmail,
      subject: `Wspomniano Cię w tickecie ${input.displayId}`,
      react: TaskCommentedEmail({
        assigneeName: input.recipientName,
        actorName: input.actorName,
        taskTitle: `${input.displayId}: ${input.subject}`,
        boardTitle:
          input.context === "note"
            ? "Notatka wewnętrzna"
            : "Odpowiedź w tickecie",
        commentExcerpt: excerpt(input.comment),
        taskUrl: ticketUrl(input.ticketId),
        mentioned: true,
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
  replyTo?: string | null;
}) {
  await sendReactEmail({
    to: input.toEmail,
    subject: input.subject,
    replyTo: input.replyTo || undefined,
    react: TicketReplyEmail({
      requesterName: input.requesterName ?? "Kliencie",
      agentName: input.agentName,
      ticketId: input.displayId,
      subject: input.subject,
      body: input.body,
      ticketUrl: ticketUrl(input.ticketId),
    }),
  });
}
