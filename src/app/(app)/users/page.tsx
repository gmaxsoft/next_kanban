import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { CreateUserForm } from "@/components/auth/create-user-form";
import { DeleteUserButton } from "@/components/auth/delete-user-button";
import { EditUserButton } from "@/components/auth/edit-user-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListFilters } from "@/components/ui/list-filters";
import { ListPagination } from "@/components/ui/list-pagination";
import { requireAuth } from "@/lib/auth-utils";
import {
  buildPaginationMeta,
  parsePagination,
  parseUsersListSearch,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TEAM_ID } from "@/lib/rbac";
import { formatActiveStatus } from "@/lib/user";

export const metadata: Metadata = {
  title: "Użytkownicy",
};

type UsersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    team?: string | string[];
    role?: string | string[];
    status?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireAuth();
  const isAdmin = session.user.isAdmin;
  const params = await searchParams;
  const filters = parseUsersListSearch(params);
  const pagination = parsePagination(params);

  const where: Prisma.UserWhereInput = {
    ...(filters.team ? { teamId: filters.team } : {}),
    ...(filters.role ? { roleId: filters.role } : {}),
    ...(filters.status === "active"
      ? { isActive: true }
      : filters.status === "inactive"
        ? { isActive: false }
        : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q } },
            { email: { contains: filters.q } },
          ],
        }
      : {}),
  };

  const total = await prisma.user.count({ where });
  const meta = buildPaginationMeta(total, pagination);

  const [users, roles, teams] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: meta.skip,
      take: meta.take,
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

  const hasActiveFilters = Boolean(
    filters.q || filters.team || filters.role || filters.status,
  );
  const listQuery = {
    q: filters.q || undefined,
    team: filters.team || undefined,
    role: filters.role || undefined,
    status: filters.status || undefined,
  };

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

      <ListFilters
        key={`${filters.q}|${filters.team}|${filters.role}|${filters.status}|${meta.pageSize}`}
        pathname="/users"
        preserve={{ pageSize: meta.pageSize }}
        fields={[
          {
            type: "search",
            name: "q",
            label: "Szukaj",
            value: filters.q,
            placeholder: "imię lub e-mail...",
          },
          {
            type: "select",
            name: "team",
            label: "Zespół",
            value: filters.team,
            emptyLabel: "Wszystkie zespoły",
            options: teams.map((team) => ({
              value: team.id,
              label: team.name,
            })),
          },
          {
            type: "select",
            name: "role",
            label: "Rola",
            value: filters.role,
            emptyLabel: "Wszystkie role",
            options: roles.map((role) => ({
              value: role.id,
              label: role.name,
            })),
          },
          {
            type: "select",
            name: "status",
            label: "Status",
            value: filters.status,
            emptyLabel: "Wszystkie statusy",
            options: [
              { value: "active", label: "Aktywne" },
              { value: "inactive", label: "Nieaktywne" },
            ],
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Zespół</CardTitle>
          <CardDescription>
            {meta.total}{" "}
            {meta.total === 1 ? "konto" : meta.total < 5 ? "konta" : "kont"}
            {hasActiveFilters ? " (po filtrach)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 overflow-x-auto">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Brak użytkowników pasujących do filtrów."
                : "Brak użytkowników."}
            </p>
          ) : (
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Imię</th>
                  <th className="py-2 pr-4 font-medium">E-mail</th>
                  <th className="py-2 pr-4 font-medium">Rola</th>
                  <th className="py-2 pr-4 font-medium">Zespół</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Utworzono</th>
                  <th className="py-2 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const canEdit = isAdmin || user.id === session.user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 data-[inactive=true]:opacity-60"
                      data-inactive={user.isActive ? undefined : "true"}
                    >
                      <td className="py-2 pr-4">{user.name}</td>
                      <td className="py-2 pr-4">{user.email}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={user.role.isAdmin ? "default" : "secondary"}
                        >
                          {user.role.name}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {user.team?.name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={user.isActive ? "outline" : "destructive"}
                        >
                          {formatActiveStatus(user.isActive)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {user.createdAt.toLocaleDateString("pl-PL")}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {canEdit ? (
                            <EditUserButton
                              user={{
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                roleId: user.roleId,
                                roleName: user.role.name,
                                teamId: user.teamId,
                                isActive: user.isActive,
                              }}
                              roles={roles}
                              teams={teams}
                              canManageRoleAndStatus={isAdmin}
                              canResetPassword={isAdmin}
                            />
                          ) : null}
                          {isAdmin && user.id !== session.user.id ? (
                            <DeleteUserButton
                              userId={user.id}
                              userName={user.name}
                            />
                          ) : null}
                          {!canEdit &&
                          !(isAdmin && user.id !== session.user.id) ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <ListPagination
            pathname="/users"
            meta={meta}
            query={listQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
}
