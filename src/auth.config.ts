import type { NextAuthConfig } from "next-auth";
import { encode as encodeJwt } from "@auth/core/jwt";

import {
  SESSION_MAX_AGE_REMEMBERED,
  sessionMaxAgeSeconds,
} from "@/lib/auth-session";

const publicRoutes = ["/login"];

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Absolute JWT lifetime; login may shorten the cookie via "Zapamiętaj mnie".
    maxAge: 60 * 60 * 24 * 30,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30,
    async encode({ token, secret, salt }) {
      const now = Math.floor(Date.now() / 1000);
      const maxAge =
        typeof token?.sessionExpiresAt === "number"
          ? Math.max(0, token.sessionExpiresAt - now)
          : SESSION_MAX_AGE_REMEMBERED;

      return encodeJwt({ token, secret, salt, maxAge });
    },
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);
      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      );
      const isAuthApi = pathname.startsWith("/api/auth");

      if (isAuthApi) {
        return true;
      }

      if (pathname.startsWith("/api/webhooks/")) {
        return true;
      }

      if (pathname.startsWith("/api/cron/")) {
        return true;
      }

      if (isPublicRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }

        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        const rememberMe =
          (user as typeof user & { rememberMe?: boolean }).rememberMe !== false;
        token.rememberMe = rememberMe;
        token.sessionExpiresAt =
          Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds(rememberMe);
        token.id = user.id!;
        token.isAdmin = user.isAdmin;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.teamId = user.teamId;
        token.teamName = user.teamName;
        token.picture = user.image;
      }

      if (trigger === "update" && session?.user) {
        if ("image" in session.user) {
          token.picture = session.user.image ?? null;
        }
        if (typeof session.user.name === "string") {
          token.name = session.user.name;
        }
        if (typeof session.user.roleName === "string") {
          token.roleName = session.user.roleName;
        }
        if (typeof session.user.roleId === "string") {
          token.roleId = session.user.roleId;
        }
        if ("isAdmin" in session.user && typeof session.user.isAdmin === "boolean") {
          token.isAdmin = session.user.isAdmin;
        }
        if ("teamId" in session.user) {
          token.teamId = session.user.teamId ?? null;
        }
        if ("teamName" in session.user) {
          token.teamName = session.user.teamName ?? null;
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.roleId = token.roleId;
      session.user.roleName = token.roleName;
      session.user.teamId = token.teamId ?? null;
      session.user.teamName = token.teamName ?? null;
      session.user.image = (token.picture as string | null | undefined) ?? null;

      return session;
    },
  },
} satisfies NextAuthConfig;
