import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { safeCallbackUrl } from "@/lib/user";

export const metadata: Metadata = {
  title: "Logowanie",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl ?? null)} />
    </main>
  );
}
