import type { NextAuthConfig } from "next-auth";

const publicRoutes = ["/login"];

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
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

      if (pathname.startsWith("/tasks") && !auth?.user.isAdmin) {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      if (pathname.startsWith("/tickets") && !auth?.user.isAdmin) {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
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
