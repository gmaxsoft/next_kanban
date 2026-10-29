import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  CalendarClock,
  Columns3,
  ListTodo,
  Plus,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";

import { PriorityBadge } from "@/components/kanban/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUnrestrictedAuth } from "@/lib/auth-utils";
import { taskPath } from "@/lib/board-query";
import { prisma } from "@/lib/prisma";
import { formatTicketId } from "@/lib/tickets";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatDueDate(value: Date | null) {
  if (!value) {
    return "Bez terminu";
  }

  return value.toLocaleDateString("pl-PL", { dateStyle: "medium" });
}

function formatTicketArrival(value: Date) {
  return value.toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function HomePage() {
  const session = await requireUnrestrictedAuth();
  const isAdmin = session.user.isAdmin;
  const userId = session.user.id;
  const teamId = session.user.teamId;
  const today = startOfToday();
  const weekEnd = endOfWeek();

  const myAssignmentFilter: Prisma.TaskWhereInput = {
    assignments: { some: { userId } },
  };

  const teamBoardFilter: Prisma.BoardWhereInput = teamId
    ? { teamId }
    : { id: { in: [] } };

  const ticketScope: Prisma.TicketWhereInput = {
    mergedIntoId: null,
    ...(isAdmin ? {} : teamId ? { teamId } : { id: { in: [] } }),
  };

  const [
    boardCount,
    taskCount,
    openTicketCount,
    inProgressTicketCount,
    resolvedTicketCount,
    myTicketCount,
    unassignedTicketCount,
    recentTickets,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    overdueCount,
    dueSoonCount,
    unassignedTaskCount,
    myTaskCount,
    myTasksPreview,
  ] = await Promise.all([
    isAdmin
      ? prisma.board.count()
      : prisma.board.count({ where: teamBoardFilter }),
    isAdmin
      ? prisma.task.count()
      : prisma.task.count({ where: myAssignmentFilter }),
    prisma.ticket.count({
      where: { ...ticketScope, status: "OPEN" },
    }),
    prisma.ticket.count({
      where: { ...ticketScope, status: "IN_PROGRESS" },
    }),
    prisma.ticket.count({
      where: { ...ticketScope, status: "RESOLVED" },
    }),
    prisma.ticket.count({
      where: { ...ticketScope, assigneeId: userId },
    }),
    isAdmin
      ? prisma.ticket.count({
          where: { ...ticketScope, assigneeId: null },
        })
      : Promise.resolve(0),
    prisma.ticket.findMany({
      where: ticketScope,
      take: 5,
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        number: true,
        subject: true,
        status: true,
        priority: true,
        lastMessageAt: true,
        assignee: { select: { name: true } },
      },
    }),
    prisma.task.count({
      where: {
        priority: "HIGH",
        ...(isAdmin ? {} : myAssignmentFilter),
      },
    }),
    prisma.task.count({
      where: {
        priority: "MEDIUM",
        ...(isAdmin ? {} : myAssignmentFilter),
      },
    }),
    prisma.task.count({
      where: {
        priority: "LOW",
        ...(isAdmin ? {} : myAssignmentFilter),
      },
    }),
    prisma.task.count({
      where: {
        dueDate: { lt: today },
        ...(isAdmin ? {} : myAssignmentFilter),
      },
    }),
    prisma.task.count({
      where: {
        dueDate: { gte: today, lte: weekEnd },
        ...(isAdmin ? {} : myAssignmentFilter),
      },
    }),
    isAdmin
      ? prisma.task.count({ where: { assignments: { none: {} } } })
      : Promise.resolve(0),
    prisma.task.count({ where: myAssignmentFilter }),
    prisma.task.findMany({
      where: myAssignmentFilter,
      take: 5,
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        column: {
          select: {
            title: true,
            board: { select: { id: true, title: true } },
          },
        },
      },
    }),
  ]);

  const ticketOverviewStats = [
    {
      title: "Otwarte",
      href: "/tickets",
      value: String(openTicketCount),
      description: isAdmin
        ? "Tickety oczekujące w systemie"
        : "Otwarte w Twoim zespole",
      icon: Ticket,
    },
    {
      title: "W trakcie",
      href: "/tickets",
      value: String(inProgressTicketCount),
      description: "Aktualnie obsługiwane zgłoszenia",
      icon: ListTodo,
    },
    {
      title: "Przypisane do mnie",
      href: "/tickets",
      value: String(myTicketCount),
      description: "Twoja kolejka ticketów",
      icon: UserRound,
    },
    isAdmin
      ? {
          title: "Bez odpowiedzialnego",
          href: "/tickets",
          value: String(unassignedTicketCount),
          description: "Wymagają przypisania",
          icon: AlertTriangle,
        }
      : {
          title: "Tablice zespołu",
          href: "/boards",
          value: String(boardCount),
          description: teamId
            ? `Tablice zespołu ${session.user.teamName}`
            : "Brak przypisanego zespołu",
          icon: Columns3,
        },
  ];

  const taskStats = isAdmin
    ? [
        {
          title: "Po terminie",
          value: overdueCount,
          description: "Wszystkie zadania po terminie",
          icon: AlertTriangle,
          tone: overdueCount > 0 ? "text-destructive" : "text-foreground",
        },
        {
          title: "Do końca tygodnia",
          value: dueSoonCount,
          description: "Terminy w bieżącym tygodniu",
          icon: CalendarClock,
          tone: "text-foreground",
        },
        {
          title: "Bez załogi",
          value: unassignedTaskCount,
          description: "Nieprzypisane do nikogo",
          icon: Users,
          tone: "text-foreground",
        },
        {
          title: "Przypisane do mnie",
          value: myTaskCount,
          description: "Twoje zadania w systemie",
          icon: UserRound,
          tone: "text-foreground",
        },
      ]
    : [
        {
          title: "Po terminie",
          value: overdueCount,
          description: "Twoje zadania po terminie",
          icon: AlertTriangle,
          tone: overdueCount > 0 ? "text-destructive" : "text-foreground",
        },
        {
          title: "Do końca tygodnia",
          value: dueSoonCount,
          description: "Twoje terminy w tym tygodniu",
          icon: CalendarClock,
          tone: "text-foreground",
        },
        {
          title: "Wysoki priorytet",
          value: highPriorityCount,
          description: "Twoje pilne zadania",
          icon: AlertTriangle,
          tone: highPriorityCount > 0 ? "text-destructive" : "text-foreground",
        },
        {
          title: "Wszystkie moje",
          value: myTaskCount,
          description: "Łącznie przypisane do Ciebie",
          icon: UserRound,
          tone: "text-foreground",
        },
      ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            Witaj, {session.user.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Skrót HelpDesk: tickety, zadania i zespoły."
              : "Twoje tickety zespołu oraz przypisane zadania."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/tickets" />}>
            <Ticket />
            Tickety
          </Button>
          {isAdmin ? (
            <>
              <Button variant="outline" render={<Link href="/boards" />}>
                <Plus />
                Nowa tablica
              </Button>
              <Button variant="outline" render={<Link href="/tasks" />}>
                <Plus />
                Nowe zadanie
              </Button>
            </>
          ) : (
            <Button variant="outline" render={<Link href="/boards" />}>
              <Plus />
              Przejdź do tablic
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ticketOverviewStats.map((stat) => (
          <Card
            key={stat.title}
            className="shadow-sm transition-all hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>
                  <Link
                    href={stat.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {stat.title}
                  </Link>
                </CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardDescription>{stat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Link
              href="/tickets"
              className="underline-offset-4 hover:underline"
            >
              Tickety
            </Link>
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Ostatnia aktywność we wszystkich zgłoszeniach."
              : "Ostatnia aktywność w ticketach Twojego zespołu."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="destructive">Otwarte: {openTicketCount}</Badge>
            <Badge>W trakcie: {inProgressTicketCount}</Badge>
            <Badge variant="secondary">
              Rozwiązane: {resolvedTicketCount}
            </Badge>
            <Badge variant="outline">Moje: {myTicketCount}</Badge>
          </div>

          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak ticketów do wyświetlenia.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {recentTickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold">
                          {formatTicketId(ticket.number)}
                        </span>
                        <TicketStatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {ticket.subject}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.assignee?.name ?? "Nieprzypisany"}
                        {" · "}
                        {formatTicketArrival(ticket.lastMessageAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button variant="outline" size="sm" render={<Link href="/tickets" />}>
              Wszystkie tickety
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Link
              href={isAdmin ? "/tasks" : "/boards"}
              className="underline-offset-4 hover:underline"
            >
              {isAdmin ? "Podsumowanie zadań" : "Moje zadania — skrót"}
            </Link>
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Priorytety, terminy i przypisania w całym systemie."
              : "Tylko zadania przypisane do Ciebie."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="destructive">Wysoki: {highPriorityCount}</Badge>
            <Badge variant="secondary">Średni: {mediumPriorityCount}</Badge>
            <Badge variant="outline">Niski: {lowPriorityCount}</Badge>
            {isAdmin ? (
              <Badge variant="outline">Wszystkie: {taskCount}</Badge>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {taskStats.map((stat) => (
              <div
                key={stat.title}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{stat.title}</p>
                  <stat.icon className="size-4 text-muted-foreground" />
                </div>
                <p
                  className={`text-2xl font-semibold tracking-tight ${stat.tone}`}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {!isAdmin ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">Najbliższe Twoje zadania</p>
              {myTasksPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nie masz jeszcze przypisanych zadań.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {myTasksPreview.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={taskPath(task.column.board.id, task.id)}
                        className="flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {task.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {task.column.board.title} · {task.column.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={task.priority} />
                          <span className="text-xs text-muted-foreground">
                            {formatDueDate(task.dueDate)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
          <CardDescription>
            Zalogowano jako {session.user.email} ({session.user.roleName}
            {session.user.teamName ? ` · ${session.user.teamName}` : ""}).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<Link href="/tickets" />}>
            Tickety
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/profile" />}>
            Profil
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/boards" />}>
            Tablice
          </Button>
          {isAdmin ? (
            <Button variant="outline" size="sm" render={<Link href="/tasks" />}>
              Zadania
            </Button>
          ) : null}
          <Button variant="outline" size="sm" render={<Link href="/users" />}>
            {isAdmin ? "Użytkownicy" : "Zespół"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
