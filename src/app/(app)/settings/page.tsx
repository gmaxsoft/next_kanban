import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Ustawienia",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Ustawienia</h2>
        <p className="text-sm text-muted-foreground">
          Konfiguracja konta i przestrzeni roboczej.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
          <CardDescription>
            Hasło i dane profilu zmienisz w widoku profilu.
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
