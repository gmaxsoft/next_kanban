import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { isRestrictedAllowedPath } from "@/lib/rbac";

const { auth } = NextAuth(authConfig);

function homeForUser(isRestricted: boolean) {
  return isRestricted ? "/tickets" : "/";
}

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(session?.user);
  const isRestricted = Boolean(session?.user?.isRestricted);
  const isLogin =
    pathname === "/login" || pathname.startsWith("/login/");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthApi) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  if (isLogin) {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(homeForUser(isRestricted), request.url),
      );
    }

    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isRestricted && !isRestrictedAllowedPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/tickets", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
