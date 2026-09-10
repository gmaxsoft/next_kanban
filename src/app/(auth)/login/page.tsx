import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
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
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl ?? null)} />
    </main>
  );
}
