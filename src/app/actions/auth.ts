"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { signIn, signOut } from "@/auth";
import { requireAdmin, requireAuth } from "@/lib/auth-utils";
import { safeCallbackUrl } from "@/lib/user";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  changePasswordSchema,
  createUserSchema,
  firstZodError,
  loginSchema,
} from "@/lib/validations/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
} | null;

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Nieprawidłowy e-mail lub hasło." };
    }

    throw error;
  }

  return null;
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function changePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await requireAuth();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) {
    return { error: "Nie znaleziono konta." };
  }

  const matchesCurrent = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!matchesCurrent) {
    return { error: "Obecne hasło jest nieprawidłowe." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { success: "Hasło zostało zmienione." };
}

export async function createUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
      },
    });
    revalidatePath("/users");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Użytkownik o tym adresie e-mail już istnieje." };
    }

    return { error: "Nie udało się utworzyć konta." };
  }

  return { success: `Konto dla ${parsed.data.email} zostało utworzone.` };
}
