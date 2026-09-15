"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export type NotificationActionState = {
  error?: string;
  success?: string;
} | null;

export async function markNotificationRead(notificationId: string) {
  const session = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  const session = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { success: "Oznaczono powiadomienia jako przeczytane." };
}
