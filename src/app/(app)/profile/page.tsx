import type { Metadata } from "next";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { AvatarUploadForm } from "@/components/auth/avatar-upload-form";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      avatarUrl: true,
      role: { select: { name: true } },
      team: { select: { name: true } },
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profil</h2>
        <p className="text-sm text-muted-foreground">
          Zdjęcie, dane konta i zmiana hasła.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Zdjęcie profilowe</CardTitle>
          <CardDescription>
            Twoja awatar będzie widoczny w czacie, navbarze i przy zadaniach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploadForm name={user.name} image={user.avatarUrl} />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Dane użytkownika</CardTitle>
          <CardDescription>Konto przypisane do Twojej sesji.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            <span className="text-muted-foreground">Imię: </span>
            {user.name}
          </p>
          <p>
            <span className="text-muted-foreground">E-mail: </span>
            {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Rola: </span>
            {user.role.name}
          </p>
          <p>
            <span className="text-muted-foreground">Zespół: </span>
            {user.team?.name ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Zmiana hasła</CardTitle>
          <CardDescription>
            Podaj obecne hasło, a następnie dwukrotnie nowe. Hasło jest hashowane
            przez bcrypt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
