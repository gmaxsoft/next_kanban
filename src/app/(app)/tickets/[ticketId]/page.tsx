import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CreateTaskFromTicketForm } from "@/components/tickets/create-task-from-ticket-form";
import { TicketConversation } from "@/components/tickets/ticket-conversation";
import { TicketReplyForm } from "@/components/tickets/ticket-reply-form";
import { TicketAssigneeForm } from "@/components/tickets/ticket-assignee-form";
import { TicketAttachmentsPanel } from "@/components/tickets/ticket-attachments";
import { TicketPriorityForm } from "@/components/tickets/ticket-priority-form";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketStatusForm } from "@/components/tickets/ticket-status-form";
import { PriorityBadge } from "@/components/kanban/priority-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-utils";
import { taskPath } from "@/lib/board-query";
import { listAssignBoards } from "@/lib/boards";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/rich-text";
import {
  canUserAccessTicket,
  formatTicketId,
  getTicketDetails,
} from "@/lib/tickets";

type TicketPageProps = {
  params: Promise<{ ticketId: string }>;
};

export async function generateMetadata({
  params,
}: TicketPageProps): Promise<Metadata> {
  const session = await requireAuth();
  const { ticketId } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { number: true, subject: true, teamId: true },
  });

  if (
    ticket &&
    !(await canUserAccessTicket(ticketId, {
      id: session.user.id,
      isAdmin: session.user.isAdmin,
      isRestricted: session.user.isRestricted,
      teamId: session.user.teamId,
    }))
  ) {
    return { title: "Ticket" };
  }

  return {
    title: ticket
      ? `${formatTicketId(ticket.number)} — ${ticket.subject}`
      : "Ticket",
  };
}

export default async function TicketDetailsPage({ params }: TicketPageProps) {
  const session = await requireAuth();
  const { ticketId } = await params;
  const ticket = await getTicketDetails(ticketId);

  if (
    !ticket ||
    !(await canUserAccessTicket(ticketId, {
      id: session.user.id,
      isAdmin: session.user.isAdmin,
      isRestricted: session.user.isRestricted,
      teamId: session.user.teamId,
    }))
  ) {
    notFound();
  }

  const isAdmin = session.user.isAdmin;
  const isRestricted = session.user.isRestricted;
  const [teams, boards, members] = await Promise.all([
    isAdmin
      ? prisma.team.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, inboundEmail: true },
        })
      : Promise.resolve([]),
    isAdmin
      ? listAssignBoards()
      : session.user.teamId
        ? prisma.board.findMany({
            where: { teamId: session.user.teamId },
            orderBy: { title: "asc" },
            select: { id: true, title: true, teamId: true, columns: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } } },
          })
        : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        isActive: true,
        ...(!isAdmin && ticket.teamId ? { teamId: ticket.teamId } : {}),
      },
      select: { id: true, name: true, email: true, teamId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const displayId = formatTicketId(ticket.number);
  const allAttachments = ticket.messages.flatMap((message) =>
    message.attachments.map((attachment) => ({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      messageId: message.id,
      createdAt: message.createdAt.toISOString(),
    })),
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit px-0"
            render={<Link href="/tickets" />}
          >
            <ArrowLeft />
            Wszystkie tickety
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-2xl font-semibold tracking-tight">
              {displayId}
            </h2>
            <TicketStatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-lg font-medium">{ticket.subject}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Zgłaszający:</span>{" "}
            {ticket.requestedBy ?? ticket.requesterName ?? ticket.requesterEmail}
            {ticket.requesterEmail !== ticket.requestedBy
              ? ` · ${ticket.requesterEmail}`
              : null}
            {ticket.team ? ` · zespół ${ticket.team.name}` : null}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
          <TicketPriorityForm
            ticketId={ticket.id}
            priority={ticket.priority}
          />
        </div>
      </div>

      {!isRestricted ? (
        <Card>
          <CardHeader>
            <CardTitle>Odpowiedzialny i obserwujący</CardTitle>
            <CardDescription>
              Obserwujący dostają powiadomienia w aplikacji i e-mailem o zmianach w tickecie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TicketAssigneeForm
              ticketId={ticket.id}
              assigneeId={ticket.assigneeId}
              watcherIds={ticket.watchers.map((watcher) => watcher.userId)}
              requestedBy={
                ticket.requestedBy ??
                ticket.requesterName ??
                ticket.requesterEmail
              }
              requesterEmail={ticket.requesterEmail}
              members={members}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Odpowiedzialny</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {ticket.assignee?.name ?? "Nieprzypisany"}
          </CardContent>
        </Card>
      )}

      {!isRestricted && ticket.task ? (
        <Card>
          <CardHeader>
            <CardTitle>Powiązane zadanie Kanban</CardTitle>
            <CardDescription>
              Ticket jest już podlinkowany do karty na tablicy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={
                <Link
                  href={taskPath(ticket.task.column.boardId, ticket.task.id)}
                />
              }
            >
              Otwórz zadanie: {ticket.task.title}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isRestricted && !ticket.task ? (
        <CreateTaskFromTicketForm
          ticketId={ticket.id}
          currentTeamId={ticket.teamId}
          teams={teams}
          boards={boards}
          members={members}
          requestedBy={
            ticket.requestedBy ?? ticket.requesterName ?? ticket.requesterEmail
          }
          assigneeId={ticket.assigneeId}
          watcherIds={ticket.watchers.map((watcher) => watcher.userId)}
          hasTask={false}
          canAssignTeam={isAdmin}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Załączniki</CardTitle>
          <CardDescription>
            Wszystkie pliki z wiadomości e-mail (PDF, obrazy, DOCX, XLSX i inne).
            PDF i obrazy możesz podglądać w aplikacji.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketAttachmentsPanel attachments={allAttachments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historia konwersacji</CardTitle>
          <CardDescription>
            E-maile przychodzące, odpowiedzi oraz notatki wewnętrzne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketConversation
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            members={members
              .filter((member) => ticket.teamId && member.teamId === ticket.teamId)
              .map(({ id, name }) => ({ id, name }))}
            messages={ticket.messages.map((message) => ({
              id: message.id,
              kind: message.kind,
              fromEmail: message.fromEmail,
              fromName: message.fromName,
              subject: message.subject,
              bodyText: message.bodyText,
              bodyHtml: message.bodyHtml
                ? sanitizeRichText(message.bodyHtml)
                : null,
              createdAt: message.createdAt.toISOString(),
              author: message.author
                ? {
                    id: message.author.id,
                    name: message.author.name,
                    avatarUrl: message.author.avatarUrl,
                  }
                : null,
              attachments: message.attachments,
            }))}
          />
        </CardContent>
      </Card>

      <TicketReplyForm
        ticketId={ticket.id}
        members={members
          .filter((member) => ticket.teamId && member.teamId === ticket.teamId)
          .map(({ id, name }) => ({ id, name }))}
      />
    </div>
  );
}
