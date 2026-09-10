import type { Metadata } from "next";

import { CreateUserForm } from "@/components/auth/create-user-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Użytkownicy",
};

export default async function UsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Użytkownicy</h2>
        <p className="text-sm text-muted-foreground">
          Tworzenie kont zespołu jest dostępne tylko dla roli ADMIN.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nowe konto</CardTitle>
          <CardDescription>
            Użytkownik dostanie e-mail i tymczasowe hasło — nie ma publicznej rejestracji.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zespół</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? "konto" : "kont"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Imię</th>
                <th className="py-2 pr-4 font-medium">E-mail</th>
                <th className="py-2 pr-4 font-medium">Rola</th>
                <th className="py-2 font-medium">Utworzono</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{user.name}</td>
                  <td className="py-2 pr-4">{user.email}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {user.createdAt.toLocaleDateString("pl-PL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
