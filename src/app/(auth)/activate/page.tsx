import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";

import { ActivateAccountForm } from "@/components/auth/activate-account-form";
import { LoginHeroBackdrop } from "@/components/auth/login-hero-backdrop";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { hashActivationToken } from "@/lib/auto-provision-user";
import { getAppLicense } from "@/lib/license";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Aktywacja konta",
};

const display = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

type ActivatePageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ActivateAccountPage({
  searchParams,
}: ActivatePageProps) {
  const license = getAppLicense();
  const params = await searchParams;
  const token = firstParam(params.token).trim();

  let email: string | undefined;
  let error: string | null = null;

  if (!token) {
    error = "Brak tokenu aktywacyjnego. Użyj linku z e-maila.";
  } else {
    const user = await prisma.user.findFirst({
      where: {
        activationTokenHash: hashActivationToken(token),
        isActive: false,
      },
      select: {
        email: true,
        activationTokenExpiresAt: true,
      },
    });

    if (!user) {
      error =
        "Link aktywacyjny jest nieprawidłowy albo konto zostało już aktywowane.";
    } else if (
      !user.activationTokenExpiresAt ||
      user.activationTokenExpiresAt.getTime() <= Date.now()
    ) {
      error =
        "Link aktywacyjny wygasł. Wyślij ponownie e-mail na HelpDesk, aby otrzymać nowy.";
    } else {
      email = user.email;
    }
  }

  return (
    <main
      className={`${display.className} relative grid min-h-svh lg:grid-cols-[1.1fr_0.9fr]`}
    >
      <section className="relative hidden overflow-hidden bg-[#141414] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16 dark:bg-[#0c0c0c]">
        <LoginHeroBackdrop />
        <div className="relative space-y-3">
          <p className="text-xs font-semibold tracking-[0.28em] text-white/60 uppercase">
            HelpDesk
          </p>
          <p className="text-sm text-white/55">
            Licencja dla{" "}
            <span className="font-medium text-[#c9a227]">
              {license.companyName}
            </span>
          </p>
        </div>
        <div className="relative space-y-2">
          <h1 className="max-w-md text-3xl font-semibold tracking-tight">
            Aktywacja konta
          </h1>
          <p className="max-w-sm text-sm text-white/65">
            Ustaw hasło, aby uzyskać dostęp do ticketów i czatu (rola Ograniczone).
          </p>
        </div>
      </section>

      <section className="relative flex flex-col justify-center gap-6 bg-background p-6 sm:p-10 lg:p-14">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ustaw hasło
            </h2>
            <p className="text-sm text-muted-foreground">
              Po aktywacji zalogujesz się na stronie logowania.
            </p>
          </div>

          {error ? (
            <div className="grid gap-4">
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
              <Button variant="outline" render={<Link href="/login" />}>
                Przejdź do logowania
              </Button>
            </div>
          ) : (
            <ActivateAccountForm token={token} email={email} />
          )}
        </div>
      </section>
    </main>
  );
}
