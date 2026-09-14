"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { signIn, signOut, unstable_update } from "@/auth";
import { requireAdmin, requireAuth } from "@/lib/auth-utils";
import {
  removeStoredAvatar,
  storeAvatarUpload,
} from "@/lib/avatar-uploads.server";
import { safeCallbackUrl } from "@/lib/user";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  changePasswordSchema,
  createUserSchema,
  firstZodError,
  loginSchema,
  updateUserSchema,
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

export async function updateAvatar(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await requireAuth();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Wybierz zdjęcie profilowe." };
  }

  try {
    const stored = await storeAvatarUpload(file);
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: stored.url },
    });

    await removeStoredAvatar(current?.avatarUrl);
    await unstable_update({ user: { image: stored.url } });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/chat");
    revalidatePath("/boards");

    return { success: "Zdjęcie profilowe zostało zapisane." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać zdjęcia profilowego.",
    };
  }
}

export async function removeAvatar(): Promise<AuthActionState> {
  const session = await requireAuth();
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  if (!current?.avatarUrl) {
    return { error: "Nie masz ustawionego zdjęcia." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });
  await removeStoredAvatar(current.avatarUrl);
  await unstable_update({ user: { image: null } });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath("/chat");
  revalidatePath("/boards");

  return { success: "Zdjęcie profilowe zostało usunięte." };
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
    roleId: String(formData.get("roleId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const role = await prisma.appRole.findUnique({
    where: { id: parsed.data.roleId },
    select: { id: true },
  });

  if (!role) {
    return { error: "Nie znaleziono wybranej roli." };
  }

  if (parsed.data.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: parsed.data.teamId },
      select: { id: true },
    });

    if (!team) {
      return { error: "Nie znaleziono wybranego zespołu." };
    }
  }

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        roleId: parsed.data.roleId,
        teamId: parsed.data.teamId,
      },
    });
    revalidatePath("/users");
    revalidatePath("/settings");
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

export async function updateUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await requireAuth();
  const isAdmin = session.user.isAdmin;

  const parsed = updateUserSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    roleId: formData.get("roleId") || undefined,
    teamId: formData.has("teamId")
      ? String(formData.get("teamId") ?? "")
      : undefined,
    isActive: formData.get("isActive") || undefined,
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const isSelf = parsed.data.userId === session.user.id;

  if (!isAdmin && !isSelf) {
    return { error: "Możesz edytować tylko własne konto." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      isActive: true,
      roleId: true,
      teamId: true,
      role: { select: { id: true, isAdmin: true, name: true } },
    },
  });

  if (!target) {
    return { error: "Nie znaleziono użytkownika." };
  }

  const nextRoleId = isAdmin
    ? (parsed.data.roleId ?? target.roleId)
    : target.roleId;
  const nextTeamId = isAdmin
    ? parsed.data.teamId === undefined
      ? target.teamId
      : parsed.data.teamId
    : target.teamId;
  const nextIsActive = isAdmin
    ? parsed.data.isActive === undefined
      ? target.isActive
      : parsed.data.isActive === "true"
    : target.isActive;

  if (isSelf && !nextIsActive) {
    return { error: "Nie możesz dezaktywować własnego konta." };
  }

  const nextRole = await prisma.appRole.findUnique({
    where: { id: nextRoleId },
    select: { id: true, isAdmin: true, name: true },
  });

  if (!nextRole) {
    return { error: "Nie znaleziono wybranej roli." };
  }

  if (target.role.isAdmin && (!nextRole.isAdmin || !nextIsActive)) {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        role: { isAdmin: true },
        NOT: { id: target.id },
      },
    });

    if (activeAdmins === 0) {
      return {
        error: "Musi pozostać co najmniej jeden aktywny ADMINISTRATOR.",
      };
    }
  }

  if (nextTeamId) {
    const team = await prisma.team.findUnique({
      where: { id: nextTeamId },
      select: { id: true, name: true },
    });

    if (!team) {
      return { error: "Nie znaleziono wybranego zespołu." };
    }
  }

  const password = parsed.data.password?.trim();

  if (password && !isAdmin) {
    return {
      error: "Hasło zmień w profilu — podając obecne hasło.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: target.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        ...(isAdmin
          ? {
              roleId: nextRoleId,
              teamId: nextTeamId,
              isActive: nextIsActive,
              ...(password
                ? { passwordHash: await hashPassword(password) }
                : {}),
            }
          : {}),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Użytkownik o tym adresie e-mail już istnieje." };
    }

    return { error: "Nie udało się zapisać zmian." };
  }

  if (isSelf) {
    const teamName = nextTeamId
      ? (
          await prisma.team.findUnique({
            where: { id: nextTeamId },
            select: { name: true },
          })
        )?.name ?? null
      : null;

    await unstable_update({
      user: {
        name: parsed.data.name,
        roleId: nextRoleId,
        roleName: nextRole.name,
        isAdmin: nextRole.isAdmin,
        teamId: nextTeamId,
        teamName,
      },
    });
  }

  revalidatePath("/users");
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/chat");
  revalidatePath("/", "layout");

  return { success: "Zapisano zmiany konta." };
}

export async function deleteUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    return { error: "Nie znaleziono użytkownika." };
  }

  if (userId === session.user.id) {
    return { error: "Nie możesz usunąć własnego konta." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: { select: { isAdmin: true } },
    },
  });

  if (!target) {
    return { error: "Nie znaleziono użytkownika." };
  }

  if (target.role.isAdmin) {
    const otherAdmins = await prisma.user.count({
      where: {
        isActive: true,
        role: { isAdmin: true },
        NOT: { id: target.id },
      },
    });

    if (otherAdmins === 0) {
      return {
        error: "Nie można usunąć ostatniego aktywnego ADMINISTRATORA.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.board.updateMany({
        where: { createdById: target.id },
        data: { createdById: session.user.id },
      });
      await tx.task.updateMany({
        where: { createdById: target.id },
        data: { createdById: session.user.id },
      });
      await tx.user.delete({ where: { id: target.id } });
    });
  } catch {
    return { error: "Nie udało się usunąć konta." };
  }

  await removeStoredAvatar(target.avatarUrl);

  revalidatePath("/users");
  revalidatePath("/settings");
  revalidatePath("/boards");
  revalidatePath("/tasks");
  revalidatePath("/chat");
  revalidatePath("/", "layout");

  return { success: `Usunięto konto: ${target.name}.` };
}
