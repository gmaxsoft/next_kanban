import { PrismaAdapter } from "@auth/prisma-adapter";
import { Auth, createActionURL, raw, skipCSRFCheck } from "@auth/core";
import { CredentialsSignin } from "@auth/core/errors";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies, headers as nextHeaders } from "next/headers";

import { authConfig } from "@/auth.config";
import {
  isAuthSessionCookieName,
  sessionMaxAgeSeconds,
} from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

const nextAuthConfig = {
  ...authConfig,
  basePath: "/api/auth",
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Hasło", type: "password" },
        rememberMe: { label: "Zapamiętaj mnie", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          email: String(credentials?.email ?? "")
            .trim()
            .toLowerCase(),
          password: String(credentials?.password ?? ""),
        });

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isAdmin: true,
                isRestricted: true,
              },
            },
            team: { select: { id: true, name: true } },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          isAdmin: user.role.isAdmin,
          isRestricted: !user.role.isAdmin && user.role.isRestricted,
          roleId: user.role.id,
          roleName: user.role.name,
          teamId: user.team?.id ?? null,
          teamName: user.team?.name ?? null,
          rememberMe: credentials?.rememberMe !== "false",
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut, unstable_update } =
  NextAuth(nextAuthConfig);

export async function signInWithPersistence(input: {
  email: string;
  password: string;
  rememberMe: boolean;
  callbackUrl: string;
}) {
  const requestHeaders = new Headers(await nextHeaders());
  const callbackActionUrl = createActionURL(
    "callback",
    requestHeaders.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http"),
    requestHeaders,
    process.env,
    nextAuthConfig,
  );
  const callbackUrl = `${callbackActionUrl}/credentials?`;

  requestHeaders.set("Content-Type", "application/x-www-form-urlencoded");
  const request = new Request(callbackUrl, {
    method: "POST",
    headers: requestHeaders,
    body: new URLSearchParams({
      email: input.email,
      password: input.password,
      rememberMe: input.rememberMe ? "true" : "false",
      callbackUrl: input.callbackUrl,
    }),
  });

  const response = await Auth(request, {
      ...nextAuthConfig,
      raw,
      skipCSRFCheck,
    }).catch((error: unknown) => {
      if (error instanceof CredentialsSignin) {
        return null;
      }
      throw error;
    });
  if (!response) return false;
  const responseUrl =
    response.redirect ??
    (response.headers instanceof Headers
      ? response.headers.get("Location") ?? undefined
      : undefined);
  if (responseUrl && new URL(responseUrl).searchParams.has("error")) {
    return false;
  }

  const maxAge = sessionMaxAgeSeconds(input.rememberMe);
  const expires = new Date(Date.now() + maxAge * 1000);
  const cookieStore = await cookies();
  for (const cookie of response.cookies ?? []) {
    const options = isAuthSessionCookieName(cookie.name)
      ? { ...cookie.options, maxAge, expires }
      : cookie.options;
    cookieStore.set(cookie.name, cookie.value, options);
  }

  return true;
}
