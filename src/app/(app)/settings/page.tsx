import type { Metadata } from "next";
import Link from "next/link";

import { RolesPanel } from "@/components/settings/roles-panel";
import { TeamsPanel } from "@/components/settings/teams-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Ustawienia",
};

export default async function SettingsPage() {
  const session = await requireAuth();
  const canManage = session.user.isAdmin;

  const [roles, teams] = await Promise.all([
    prisma.appRole.findMany({
      orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Ustawienia</h2>
        <p className="text-sm text-muted-foreground">
          Zespoły, role oraz skrót do profilu konta.
        </p>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Zespoły</TabsTrigger>
          <TabsTrigger value="roles">Role</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Zespoły</CardTitle>
              <CardDescription>
                Organizuj ludzi w zespoły — czat działa w obrębie wybranego zespołu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamsPanel
                canManage={canManage}
                teams={teams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  description: team.description,
                  userCount: team._count.users,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Role</CardTitle>
              <CardDescription>
                Definiuj role uprawnień. Roli ADMINISTRATOR nie można usunąć.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesPanel
                canManage={canManage}
                roles={roles.map((role) => ({
                  id: role.id,
                  name: role.name,
                  slug: role.slug,
                  isSystem: role.isSystem,
                  isAdmin: role.isAdmin,
                  userCount: role._count.users,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
          <CardDescription>
            Hasło i zdjęcie profilowe zmienisz w widoku profilu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/profile" />}>
            Przejdź do profilu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
