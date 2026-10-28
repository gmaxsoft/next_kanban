import type { Metadata } from "next";

import { CreateUserForm } from "@/components/auth/create-user-form";
import {
  UsersDataTable,
  type UsersTableRow,
} from "@/components/users/users-data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUnrestrictedAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TEAM_ID } from "@/lib/rbac";
import { formatActiveStatus } from "@/lib/user";

export const metadata: Metadata = {
  title: "Użytkownicy",
};

export default async function UsersPage() {
  const session = await requireUnrestrictedAuth();
  const isAdmin = session.user.isAdmin;

  const [users, roles, teams] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        roleId: true,
        teamId: true,
        role: { select: { name: true, isAdmin: true } },
        team: { select: { name: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.appRole.findMany({
      select: { id: true, name: true },
      orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: UsersTableRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    roleId: user.roleId,
    teamId: user.teamId,
    roleName: user.role.name,
    roleIsAdmin: user.role.isAdmin,
    teamName: user.team?.name ?? "—",
    statusLabel: formatActiveStatus(user.isActive),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Użytkownicy</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Zarządzaj kontami, rolami, zespołami i statusem aktywności."
            : "Lista zespołu — możesz edytować tylko własne konto."}
        </p>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Nowe konto</CardTitle>
            <CardDescription>
              Użytkownik dostanie e-mail i tymczasowe hasło — nie ma publicznej
              rejestracji.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateUserForm
              roles={roles}
              teams={teams}
              defaultTeamId={DEFAULT_TEAM_ID}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <UsersDataTable
          data={rows}
          roles={roles}
          teams={teams}
          isAdmin={isAdmin}
          currentUserId={session.user.id}
          description={`${rows.length} ${
            rows.length === 1 ? "konto" : rows.length < 5 ? "konta" : "kont"
          } · sortowanie i filtry kolumn (TanStack Table)`}
        />
      </Card>
    </div>
  );
}
