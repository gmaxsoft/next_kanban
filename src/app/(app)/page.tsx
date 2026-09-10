import Link from "next/link";
import { Columns3, ListTodo, Plus, Users } from "lucide-react";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const session = await requireAuth();
  const [boardCount, taskCount, userCount] = await Promise.all([
    prisma.board.count(),
    prisma.task.count(),
    prisma.user.count(),
  ]);

  const stats = [
    {
      title: "Tablice",
      value: String(boardCount),
      description: "Aktywne tablice Kanban",
      icon: Columns3,
    },
    {
      title: "Zadania",
      value: String(taskCount),
      description: "Wszystkie karty na tablicach",
      icon: ListTodo,
    },
    {
      title: "Członkowie",
      value: String(userCount),
      description: "Użytkownicy w przestrzeni",
      icon: Users,
    },
  ];

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            Witaj, {session.user.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Zarządzaj tablicami, kolumnami i zadaniami w jednym miejscu.
          </p>
        </div>
        <Button render={<Link href="/boards" />}>
          <Plus />
          {isAdmin ? "Nowa tablica" : "Przejdź do tablic"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{stat.title}</CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardDescription>{stat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szybki start</CardTitle>
          <CardDescription>
            Zalogowano jako {session.user.email} ({session.user.role}).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">Next.js App Router</Badge>
          <Badge variant="secondary">Auth.js</Badge>
          <Badge variant="secondary">Prisma + MySQL</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
