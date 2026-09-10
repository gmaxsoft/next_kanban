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

      if (isPublicRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }

        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      if (pathname.startsWith("/users") && auth?.user.role !== "ADMIN") {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;

      return session;
    },
  },
} satisfies NextAuthConfig;
