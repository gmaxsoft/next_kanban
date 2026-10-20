import { sendTeamNotificationEmail, ticketUrl } from "@/lib/mail";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function notifyTicketParticipants(input: {
  ticketId: string;
  actorId?: string | null;
  title: string;
  body: string;
}) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    include: {
      assignee: { select: { id: true, name: true, email: true, isActive: true } },
      watchers: {
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
      },
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

  if (!ticket) return;

  const recipients = new Map<string, { id: string; name: string; email: string }>();
  if (ticket.assignee?.isActive && ticket.assignee.id !== input.actorId) {
    recipients.set(ticket.assignee.id, ticket.assignee);
  }
  for (const watcher of ticket.watchers) {
    if (watcher.user.isActive && watcher.user.id !== input.actorId) {
      recipients.set(watcher.user.id, watcher.user);
    }
  }

  const people = [...recipients.values()];
  const href = ticketUrl(ticket.id);
  await createNotifications(people.map((person) => person.id), {
    title: input.title,
    body: input.body,
    href,
  });

  const team = ticket.team;
  if (
    !team?.inboundEmail ||
    !team.imapHost?.startsWith("imap.") ||
    !team.imapUser ||
    !team.imapPassword
  ) {
    return;
  }

  const results = await Promise.allSettled(
    people.map((person) =>
      sendTeamNotificationEmail({
        toEmail: person.email,
        inboundEmail: team.inboundEmail!,
        smtpHost: team.imapHost!.replace(/^imap\./i, "smtp."),
        smtpUser: team.imapUser!,
        smtpPassword: team.imapPassword!,
        subject: input.title,
        body: `${input.body}\n\nTicket w Next Kanban: ${href}`,
      }),
    ),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[ticket-notifications] email failed", people[index]?.email, result.reason);
    }
  });
}
