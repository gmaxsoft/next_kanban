"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell } from "lucide-react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppNotification } from "@/lib/notifications";

function formatNotificationDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: AppNotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Powiadomienia"
            className="relative overflow-visible"
          />
        }
      >
        <Bell />
        {unreadCount > 0 ? (
          <span
            data-slot="notification-badge"
            className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center bg-destructive text-[10px] font-semibold leading-none text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            Powiadomienia
          </p>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await markAllNotificationsRead();
                  router.refresh();
                });
              }}
            >
              Oznacz wszystkie
            </Button>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Brak powiadomień.
          </p>
        ) : (
          <DropdownMenuGroup className="max-h-80 overflow-y-auto p-1">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              const content = (
                <div className="grid gap-0.5 text-left">
                  <span
                    className={`text-sm ${unread ? "font-semibold text-foreground" : "font-medium"}`}
                  >
                    {notification.title}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {notification.body}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatNotificationDate(notification.createdAt)}
                  </span>
                </div>
              );

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`items-start ${unread ? "bg-muted/50" : ""}`}
                  render={
                    notification.href ? (
                      <Link href={notification.href} />
                    ) : undefined
                  }
                  onClick={() => {
                    startTransition(async () => {
                      if (unread) {
                        await markNotificationRead(notification.id);
                      }
                      router.refresh();
                    });
                  }}
                >
                  {content}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />
        <p className="px-3 py-2 text-[11px] text-muted-foreground">
          Powiadomienia pojawiają się też przy przypisaniu i wzmiankach w
          komentarzach.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
