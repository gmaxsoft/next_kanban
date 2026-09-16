import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CreateTaskFromTicketForm } from "@/components/tickets/create-task-from-ticket-form";
import { TicketConversation } from "@/components/tickets/ticket-conversation";
import { TicketReplyForm } from "@/components/tickets/ticket-reply-form";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketStatusForm } from "@/components/tickets/ticket-status-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-utils";
import { taskPath } from "@/lib/board-query";
import { listAssignBoards } from "@/lib/boards";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/rich-text";
import { formatTicketId, getTicketDetails } from "@/lib/tickets";

type TicketPageProps = {
  params: Promise<{ ticketId: string }>;
};

export async function generateMetadata({
  params,
}: TicketPageProps): Promise<Metadata> {
  const { ticketId } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { number: true, subject: true },
  });

  return {
    title: ticket
      ? `${formatTicketId(ticket.number)} — ${ticket.subject}`
      : "Ticket",
  };
}

export default async function TicketDetailsPage({ params }: TicketPageProps) {
  await requireAdmin();
  const { ticketId } = await params;
  const ticket = await getTicketDetails(ticketId);

  if (!ticket) {
    notFound();
  }

  const [teams, boards] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, inboundEmail: true },
    }),
    listAssignBoards(),
  ]);

  const displayId = formatTicketId(ticket.number);

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
          </div>
          <p className="text-lg font-medium">{ticket.subject}</p>
          <p className="text-sm text-muted-foreground">
            {ticket.requesterName ? `${ticket.requesterName} · ` : null}
            {ticket.requesterEmail}
            {ticket.team ? ` · zespół ${ticket.team.name}` : null}
          </p>
        </div>

        <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
      </div>

      {ticket.task ? (
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
      ) : (
        <CreateTaskFromTicketForm
          ticketId={ticket.id}
          currentTeamId={ticket.teamId}
          teams={teams}
          boards={boards}
          hasTask={false}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historia konwersacji</CardTitle>
          <CardDescription>
            E-maile przychodzące, odpowiedzi oraz notatki wewnętrzne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketConversation
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
            }))}
          />
        </CardContent>
      </Card>

      <TicketReplyForm ticketId={ticket.id} />
    </div>
  );
}
