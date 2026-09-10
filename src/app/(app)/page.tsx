import Link from "next/link";
import { Columns3, ListTodo, Plus, Users } from "lucide-react";

import { requireAuth } from "@/lib/auth-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Tablice",
    value: "0",
    description: "Aktywne tablice Kanban",
    icon: Columns3,
  },
  {
    title: "Zadania",
    value: "0",
    description: "Wszystkie karty na tablicach",
    icon: ListTodo,
  },
  {
    title: "Członkowie",
    value: "0",
    description: "Użytkownicy w przestrzeni",
    icon: Users,
  },
];

export default async function HomePage() {
  const session = await requireAuth();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Witaj, {session.user.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Zarządzaj tablicami, kolumnami i zadaniami w jednym miejscu.
          </p>
        </div>
        <Button render={<Link href="/boards" />}>
          <Plus />
          Nowa tablica
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
