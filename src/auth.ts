import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Hasło", type: "password" },
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
            role: { select: { id: true, name: true, isAdmin: true } },
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
          roleId: user.role.id,
          roleName: user.role.name,
          teamId: user.team?.id ?? null,
          teamName: user.team?.name ?? null,
        };
      },
    }),
  ],
});
