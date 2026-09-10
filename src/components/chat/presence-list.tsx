"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatMember } from "@/lib/chat";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

export function PresenceList({
  members,
  onlineUserIds,
  currentUserId,
  connected,
}: {
  members: ChatMember[];
  onlineUserIds: string[];
  currentUserId: string;
  connected: boolean;
}) {
  const online = new Set(onlineUserIds);

  if (connected) {
    online.add(currentUserId);
  } else {
    online.delete(currentUserId);
  }

  const sorted = [...members].sort((a, b) => {
    const aOnline = online.has(a.id) ? 0 : 1;
    const bOnline = online.has(b.id) ? 0 : 1;

    if (aOnline !== bOnline) {
      return aOnline - bOnline;
    }

    return a.name.localeCompare(b.name, "pl");
  });

  return (
    <aside className="flex w-full shrink-0 flex-col border-t bg-card lg:w-72 lg:border-t-0 lg:border-l">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Zespół</h3>
        <p className="text-xs text-muted-foreground">
          {online.size} online · {members.length} łącznie
        </p>
      </div>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
        {sorted.map((member) => {
          const isOnline = online.has(member.id);

          return (
            <li
              key={member.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
            >
              <div className="relative">
                <Avatar size="sm" className="size-8">
                  <AvatarImage
                    src={member.avatarUrl ?? undefined}
                    alt={member.name}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-card",
                    isOnline ? "bg-emerald-500" : "bg-zinc-400",
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {member.id === currentUserId ? " (Ty)" : ""}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
