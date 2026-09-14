import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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

  return (
    <main className={`${display.className} relative grid min-h-svh lg:grid-cols-[1.1fr_0.9fr]`}>
      <section className="relative hidden overflow-hidden bg-[#141414] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16 dark:bg-[#0c0c0c]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(201,162,39,0.28), transparent 42%), linear-gradient(0deg, rgba(0,0,0,0.45), transparent 55%), repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 72px), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 72px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] rotate-12 border border-white/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-16 bottom-28 size-40 border border-[#c9a227]/50"
        />

        <p className="relative text-xs font-semibold tracking-[0.28em] text-white/60 uppercase">
          Workspace
        </p>

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
          <span className="inline-block h-px w-10 bg-[#c9a227]" />
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
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Zaloguj się
            </h2>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Wejdź kontem służbowym. Dostęp tylko dla użytkowników utworzonych przez
              administratora.
            </p>
          </div>

          <LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl ?? null)} />
        </div>
      </section>
    </main>
  );
}
