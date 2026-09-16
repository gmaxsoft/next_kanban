import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import { LoginForm } from "@/components/auth/login-form";
import { LoginHeroBackdrop } from "@/components/auth/login-hero-backdrop";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getAppLicense } from "@/lib/license";
import { safeCallbackUrl } from "@/lib/user";

export const metadata: Metadata = {
  title: "Logowanie",
};

const display = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const license = getAppLicense();

  return (
    <main className={`${display.className} relative grid min-h-svh lg:grid-cols-[1.1fr_0.9fr]`}>
      <section className="relative hidden overflow-hidden bg-[#141414] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16 dark:bg-[#0c0c0c]">
        <LoginHeroBackdrop />

        <div className="relative space-y-3">
          <p className="text-xs font-semibold tracking-[0.28em] text-white/60 uppercase">
            Workspace
          </p>
          <p className="text-sm text-white/55">
            Licencja dla{" "}
            <span className="font-medium text-[#c9a227]">{license.companyName}</span>
          </p>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-xl text-6xl leading-[0.95] font-semibold tracking-tight text-[#fff] xl:text-7xl">
            Next
            <br />
            Kanban
          </h1>
          <p className="max-w-md text-base leading-7 text-white/70">
            Tablice, zadania i czat zespołu w jednym spójnym, minimalnym panelu.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-xs tracking-[0.18em] text-white/45 uppercase">
          <span className="login-hero-accent-line inline-block h-px w-10 bg-[#c9a227]" />
          Real-time · MySQL · Auth.js
        </div>
      </section>

      <section className="relative flex flex-col bg-background">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-16 sm:px-10 lg:px-14 xl:px-20">
          <div className="mb-10 space-y-3 lg:mb-12">
            <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase lg:hidden">
              Next Kanban
            </p>
            <p className="text-xs tracking-wide text-muted-foreground lg:hidden">
              Licencja:{" "}
              <span className="font-medium text-foreground">
                {license.companyName}
              </span>
            </p>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Zaloguj się
            </h2>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Wejdź kontem służbowym. Dostęp tylko dla użytkowników utworzonych przez
              administratora.
            </p>
          </div>

          <LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl ?? null)} />

          <aside className="mt-10 max-w-md border-t border-border pt-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Licencja oprogramowania
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {license.notice}
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground/80">
              Licencjobiorca:{" "}
              <span className="font-medium text-foreground/80">
                {license.companyName}
              </span>
              {" · "}
              Dostawca: {license.vendorName}
              {" · "}
              Autor: {license.authorName}
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
