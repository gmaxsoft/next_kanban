import { taskPath } from "@/lib/board-query";
import { createNotifications } from "@/lib/notifications";
import { sendTeamNotificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export async function notifyTaskParticipants(input: {
  taskId: string;
  actorId?: string | null;
  excludeUserIds?: string[];
  title: string;
  body: string;
}) {
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
      },
      watchers: {
        include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
      },
      column: {
        select: {
          boardId: true,
          board: {
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
          },
        },
      },
    },
  });

  if (!task) return;

  const recipients = new Map<string, { id: string; name: string; email: string }>();
  const excluded = new Set(input.excludeUserIds ?? []);
  for (const assignment of task.assignments) {
    if (assignment.user.isActive && assignment.user.id !== input.actorId && !excluded.has(assignment.user.id)) {
      recipients.set(assignment.user.id, assignment.user);
    }
  }
  for (const watcher of task.watchers) {
    if (watcher.user.isActive && watcher.user.id !== input.actorId && !excluded.has(watcher.user.id)) {
      recipients.set(watcher.user.id, watcher.user);
    }
  }

  const people = [...recipients.values()];
  const href = taskPath(task.column.boardId, task.id);
  await createNotifications(people.map((person) => person.id), {
    title: input.title,
    body: input.body,
    href,
  });

  const team = task.column.board.team;
  if (
    !team.inboundEmail ||
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
        body: `${input.body}\n\nZadanie w Next Kanban: ${href}`,
      }),
    ),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[task-notifications] email failed", people[index]?.email, result.reason);
    }
  });
}
