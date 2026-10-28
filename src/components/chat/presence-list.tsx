"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatMember, DirectPeer, DmUnreadByPeer } from "@/lib/chat";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="ml-1 shrink-0 font-semibold text-destructive">
      ({count > 99 ? "99+" : count})
    </span>
  );
}

export function PresenceList({
  members,
  onlineUserIds,
  currentUserId,
  connected,
  teamName,
  teamId,
  activePeerUserId,
  recentPeers = [],
  dmUnreadByPeer = {},
}: {
  members: ChatMember[];
  onlineUserIds: string[];
  currentUserId: string;
  connected: boolean;
  teamName?: string;
  teamId: string;
  activePeerUserId?: string | null;
  recentPeers?: DirectPeer[];
  dmUnreadByPeer?: DmUnreadByPeer;
}) {
  const online = new Set(onlineUserIds);

  if (connected) {
    online.add(currentUserId);
  } else {
    online.delete(currentUserId);
  }

  const sorted = [...members].sort((a, b) => {
    const aUnread = dmUnreadByPeer[a.id] ?? 0;
    const bUnread = dmUnreadByPeer[b.id] ?? 0;
    if ((aUnread > 0) !== (bUnread > 0)) {
      return aUnread > 0 ? -1 : 1;
    }

    const aOnline = online.has(a.id) ? 0 : 1;
    const bOnline = online.has(b.id) ? 0 : 1;
    if (aOnline !== bOnline) {
      return aOnline - bOnline;
    }

    return a.name.localeCompare(b.name, "pl");
  });

  const recentOthers = [...recentPeers]
    .filter((peer) => peer.id !== currentUserId)
    .sort((a, b) => {
      const aUnread = dmUnreadByPeer[a.id] ?? a.unreadCount ?? 0;
      const bUnread = dmUnreadByPeer[b.id] ?? b.unreadCount ?? 0;
      if ((aUnread > 0) !== (bUnread > 0)) {
        return aUnread > 0 ? -1 : 1;
      }
      return 0;
    });

  return (
    <aside className="flex w-full shrink-0 flex-col border-t bg-card lg:w-72 lg:border-t-0 lg:border-l">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{teamName ?? "Zespół"}</h3>
        <p className="text-xs text-muted-foreground">
          {online.size} online · {members.length} łącznie
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Kliknij osobę, aby otworzyć rozmowę prywatną.
        </p>
      </div>

      {recentOthers.length > 0 ? (
        <div className="border-b px-2 py-2">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Ostatnie DM
          </p>
          <ul className="flex flex-col gap-0.5">
            {recentOthers.map((peer) => {
              const active = activePeerUserId === peer.id;
              const unread = dmUnreadByPeer[peer.id] ?? peer.unreadCount ?? 0;
              const needsReply = unread > 0;

              return (
                <li key={peer.conversationId}>
                  <Link
                    href={`/chat?team=${teamId}&dm=${peer.id}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60",
                      active && "bg-muted",
                    )}
                  >
                    <Avatar size="sm" className="size-7">
                      <AvatarImage
                        src={peer.avatarUrl ?? undefined}
                        alt={peer.name}
                      />
                      <AvatarFallback className="text-[9px]">
                        {getInitials(peer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          needsReply ? "font-semibold" : "font-medium",
                        )}
                      >
                        {peer.name}
                        <UnreadBadge count={unread} />
                      </p>
                      {needsReply ? (
                        <p className="text-xs text-destructive">odpisz DM</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
        {sorted.map((member) => {
          const isOnline = online.has(member.id);
          const isSelf = member.id === currentUserId;
          const active = activePeerUserId === member.id;
          const unread = dmUnreadByPeer[member.id] ?? 0;
          const needsReply = !isSelf && unread > 0;

          const content = (
            <>
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
                <p
                  className={cn(
                    "truncate text-sm",
                    needsReply ? "font-semibold" : "font-medium",
                  )}
                >
                  {member.name}
                  {isSelf ? " (Ty)" : null}
                  <UnreadBadge count={unread} />
                </p>
                <p
                  className={cn(
                    "text-xs",
                    needsReply
                      ? "text-destructive"
                      : isOnline
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                  )}
                >
                  {isSelf
                    ? isOnline
                      ? "Online"
                      : "Offline"
                    : needsReply
                      ? `${isOnline ? "Online" : "Offline"} · odpisz DM`
                      : `${isOnline ? "Online" : "Offline"} · napisz DM`}
                </p>
              </div>
            </>
          );

          return (
            <li key={member.id}>
              {isSelf ? (
                <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  {content}
                </div>
              ) : (
                <Link
                  href={`/chat?team=${teamId}&dm=${member.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60",
                    active && "bg-muted",
                    needsReply && !active && "bg-destructive/5",
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
