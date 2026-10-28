import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      role: { select: { isAdmin: true, isRestricted: true } },
    },
  });

  if (!account?.isActive) {
    await signOut({ redirect: false });
    redirect("/login");
  }

  // Prefer live DB flags so role changes apply without stale JWT gaps.
  session.user.isAdmin = account.role.isAdmin;
  session.user.isRestricted =
    !account.role.isAdmin && account.role.isRestricted;

  return session;
}

/** Blocks tickets-only (Ograniczone) users from non-ticket app areas. */
export async function requireUnrestrictedAuth() {
  const session = await requireAuth();

  if (session.user.isRestricted) {
    redirect("/tickets");
  }

  return session;
}

/** For server actions that should return an error instead of redirecting. */
export async function denyIfRestricted() {
  const session = await requireAuth();
  if (session.user.isRestricted) {
    return {
      session,
      error: "Brak uprawnień." as const,
    };
  }
  return { session, error: null };
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.isAdmin) {
    return session;
  }

  if (session.user.isRestricted) {
    redirect("/tickets");
  }

  redirect("/");
}
