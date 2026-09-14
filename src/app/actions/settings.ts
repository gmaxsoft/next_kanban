"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { SYSTEM_ADMIN_SLUG, slugifyRoleName } from "@/lib/rbac";
import {
  firstZodError,
  roleSchema,
  teamSchema,
  updateRoleSchema,
  updateTeamSchema,
} from "@/lib/validations/auth";

export type SettingsActionState = {
  error?: string;
  success?: string;
} | null;

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/users");
  revalidatePath("/profile");
  revalidatePath("/chat");
  revalidatePath("/", "layout");
}

export async function createRole(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const parsed = roleSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    isAdmin: formData.get("isAdmin") || "false",
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  let slug = slugifyRoleName(parsed.data.name);
  const existingSlug = await prisma.appRole.findUnique({ where: { slug } });

  if (existingSlug) {
    slug = `${slug}_${Date.now().toString(36).toUpperCase()}`.slice(0, 64);
  }

  try {
    await prisma.appRole.create({
      data: {
        name: parsed.data.name,
        slug,
        isAdmin: parsed.data.isAdmin === "true",
        isSystem: false,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Rola o takiej nazwie już istnieje." };
    }
    return { error: "Nie udało się utworzyć roli." };
  }

  revalidateSettings();
  return { success: "Dodano rolę." };
}

export async function updateRole(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const parsed = updateRoleSchema.safeParse({
    roleId: String(formData.get("roleId") ?? ""),
    name: String(formData.get("name") ?? ""),
    isAdmin: formData.get("isAdmin") || "false",
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const role = await prisma.appRole.findUnique({
    where: { id: parsed.data.roleId },
  });

  if (!role) {
    return { error: "Nie znaleziono roli." };
  }

  if (role.slug === SYSTEM_ADMIN_SLUG && parsed.data.isAdmin !== "true") {
    return { error: "Rola ADMINISTRATOR musi zachować uprawnienia admina." };
  }

  try {
    await prisma.appRole.update({
      where: { id: role.id },
      data: {
        name: parsed.data.name,
        isAdmin:
          role.slug === SYSTEM_ADMIN_SLUG
            ? true
            : parsed.data.isAdmin === "true",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Rola o takiej nazwie już istnieje." };
    }
    return { error: "Nie udało się zapisać roli." };
  }

  revalidateSettings();
  return { success: "Zapisano rolę." };
}

export async function deleteRole(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const roleId = String(formData.get("roleId") ?? "");
  const role = await prisma.appRole.findUnique({
    where: { id: roleId },
    include: { _count: { select: { users: true } } },
  });

  if (!role) {
    return { error: "Nie znaleziono roli." };
  }

  if (role.slug === SYSTEM_ADMIN_SLUG || (role.isSystem && role.isAdmin)) {
    return { error: "Roli ADMINISTRATOR nie można usunąć." };
  }

  if (role._count.users > 0) {
    return {
      error: "Nie można usunąć roli przypisanej do użytkowników.",
    };
  }

  await prisma.appRole.delete({ where: { id: role.id } });
  revalidateSettings();
  return { success: "Usunięto rolę." };
}

export async function createTeam(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const parsed = teamSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: description || undefined,
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await prisma.team.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Zespół o takiej nazwie już istnieje." };
    }
    return { error: "Nie udało się utworzyć zespołu." };
  }

  revalidateSettings();
  return { success: "Dodano zespół." };
}

export async function updateTeam(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const parsed = updateTeamSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: description || undefined,
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await prisma.team.update({
      where: { id: parsed.data.teamId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Zespół o takiej nazwie już istnieje." };
    }
    return { error: "Nie udało się zapisać zespołu." };
  }

  revalidateSettings();
  return { success: "Zapisano zespół." };
}

export async function deleteTeam(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const teamId = String(formData.get("teamId") ?? "");
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { _count: { select: { users: true, chatMessages: true } } },
  });

  if (!team) {
    return { error: "Nie znaleziono zespołu." };
  }

  if (team._count.users > 0) {
    return {
      error: "Najpierw przenieś użytkowników do innego zespołu.",
    };
  }

  await prisma.team.delete({ where: { id: team.id } });
  revalidateSettings();
  return { success: "Usunięto zespół." };
}
