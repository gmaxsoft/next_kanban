"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import {
  roleFlagsFromPermission,
  SYSTEM_ADMIN_SLUG,
  SYSTEM_RESTRICTED_SLUG,
  slugifyRoleName,
  type RolePermission,
} from "@/lib/rbac";
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
    permission: String(formData.get("permission") ?? "standard"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  let slug = slugifyRoleName(parsed.data.name);
  const existingSlug = await prisma.appRole.findUnique({ where: { slug } });

  if (existingSlug) {
    slug = `${slug}_${Date.now().toString(36).toUpperCase()}`.slice(0, 64);
  }

  const flags = roleFlagsFromPermission(parsed.data.permission);

  try {
    await prisma.appRole.create({
      data: {
        name: parsed.data.name,
        slug,
        isAdmin: flags.isAdmin,
        isRestricted: flags.isRestricted,
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
    permission: String(formData.get("permission") ?? "standard"),
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

  if (
    role.slug === SYSTEM_ADMIN_SLUG &&
    parsed.data.permission !== "admin"
  ) {
    return { error: "Rola ADMINISTRATOR musi zachować uprawnienia admina." };
  }

  if (
    role.slug === SYSTEM_RESTRICTED_SLUG &&
    parsed.data.permission !== "restricted"
  ) {
    return {
      error: "Systemowa rola Ograniczone musi pozostać uprawnieniem Ograniczone.",
    };
  }

  const flags =
    role.slug === SYSTEM_ADMIN_SLUG
      ? roleFlagsFromPermission("admin")
      : role.slug === SYSTEM_RESTRICTED_SLUG
        ? roleFlagsFromPermission("restricted")
        : roleFlagsFromPermission(parsed.data.permission as RolePermission);

  try {
    await prisma.appRole.update({
      where: { id: role.id },
      data: {
        name: parsed.data.name,
        isAdmin: flags.isAdmin,
        isRestricted: flags.isRestricted,
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

  if (
    role.slug === SYSTEM_ADMIN_SLUG ||
    role.slug === SYSTEM_RESTRICTED_SLUG ||
    (role.isSystem && role.isAdmin)
  ) {
    return { error: "Tej systemowej roli nie można usunąć." };
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

function parseTeamFormData(formData: FormData, options?: { keepImapPassword?: boolean }) {
  const description = String(formData.get("description") ?? "").trim();
  const inboundEmail = String(formData.get("inboundEmail") ?? "").trim();
  const inboundType = String(formData.get("inboundType") ?? "WEBHOOK");
  const imapPortRaw = String(formData.get("imapPort") ?? "993").trim();

  return teamSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: description || undefined,
    inboundEmail: inboundEmail || "",
    inboundType: inboundType === "IMAP" ? "IMAP" : "WEBHOOK",
    imapHost: String(formData.get("imapHost") ?? "").trim(),
    imapPort: imapPortRaw || 993,
    imapUser: String(formData.get("imapUser") ?? "").trim(),
    imapPassword: String(formData.get("imapPassword") ?? ""),
    imapSecure: String(formData.get("imapSecure") ?? "true") === "false" ? "false" : "true",
    imapMailbox: String(formData.get("imapMailbox") ?? "").trim() || "INBOX",
    imapAllowedSenderDomains: String(
      formData.get("imapAllowedSenderDomains") ?? "pwginfo.pl",
    ).trim(),
    keepImapPassword: options?.keepImapPassword ?? false,
  });
}

function teamInboundData(parsed: z.infer<typeof teamSchema>, existingPassword?: string | null) {
  const isImap = parsed.inboundType === "IMAP";
  return {
    inboundEmail: parsed.inboundEmail || null,
    inboundType: parsed.inboundType,
    imapHost: isImap ? parsed.imapHost || null : null,
    imapPort: isImap ? parsed.imapPort : null,
    imapUser: isImap ? parsed.imapUser || null : null,
    imapPassword: isImap
      ? parsed.imapPassword || existingPassword || null
      : null,
    imapSecure: isImap ? parsed.imapSecure === "true" : true,
    imapMailbox: isImap ? parsed.imapMailbox || "INBOX" : null,
    imapAllowedSenderDomains: parsed.imapAllowedSenderDomains
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map((domain) => domain.toLowerCase())
      .join("\n"),
  };
}

export async function createTeam(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const parsed = parseTeamFormData(formData);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await prisma.team.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        ...teamInboundData(parsed.data),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Zespół lub skrzynka e-mail już istnieje." };
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

  const teamId = String(formData.get("teamId") ?? "");
  const passwordInput = String(formData.get("imapPassword") ?? "");
  const existing = await prisma.team.findUnique({
    where: { id: teamId },
    select: { imapPassword: true },
  });

  if (!existing) {
    return { error: "Nie znaleziono zespołu." };
  }

  const formParsed = parseTeamFormData(formData, {
    keepImapPassword: !passwordInput && Boolean(existing.imapPassword),
  });

  if (!formParsed.success) {
    return { error: firstZodError(formParsed.error) };
  }

  const withId = updateTeamSchema.safeParse({
    teamId,
    ...formParsed.data,
  });

  if (!withId.success) {
    return { error: firstZodError(withId.error) };
  }

  try {
    await prisma.team.update({
      where: { id: withId.data.teamId },
      data: {
        name: withId.data.name,
        description: withId.data.description ?? null,
        ...teamInboundData(withId.data, existing.imapPassword),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Zespół lub skrzynka e-mail już istnieje." };
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
