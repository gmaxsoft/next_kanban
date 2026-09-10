import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-utils";
import { getInitials } from "@/lib/user";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const session = await requireAuth();
  const initials = getInitials(session.user.name);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profil</h2>
        <p className="text-sm text-muted-foreground">
          Dane konta i zmiana hasła.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Dane użytkownika</CardTitle>
          <CardDescription>Konto przypisane do Twojej sesji.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
            {initials}
          </div>
          <p>
            <span className="text-muted-foreground">Imię: </span>
            {session.user.name}
          </p>
          <p>
            <span className="text-muted-foreground">E-mail: </span>
            {session.user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Rola: </span>
            {session.user.role}
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
