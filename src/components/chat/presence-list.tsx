"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  createGroupConversationAction,
  deleteGroupConversationAction,
} from "@/app/actions/chat";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  GROUP_CHAT_MAX_OTHERS,
  GROUP_CHAT_MIN_OTHERS,
  type ChatMember,
  type DirectPeer,
  type DmUnreadByPeer,
  type GroupConversationSummary,
  type GroupUnreadById,
} from "@/lib/chat";
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
  activeGroupId,
  recentPeers = [],
  recentGroups = [],
  dmUnreadByPeer = {},
  groupUnreadById = {},
}: {
  members: ChatMember[];
  onlineUserIds: string[];
  currentUserId: string;
  connected: boolean;
  teamName?: string;
  teamId: string;
  activePeerUserId?: string | null;
  activeGroupId?: string | null;
  recentPeers?: DirectPeer[];
  recentGroups?: GroupConversationSummary[];
  dmUnreadByPeer?: DmUnreadByPeer;
  groupUnreadById?: GroupUnreadById;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const online = new Set(onlineUserIds);

  if (connected) {
    online.add(currentUserId);
  } else {
    online.delete(currentUserId);
  }

  const otherMemberIds = members
    .filter((member) => member.id !== currentUserId)
    .map((member) => member.id);

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

  const groupsSorted = [...recentGroups].sort((a, b) => {
    const aUnread = groupUnreadById[a.id] ?? a.unreadCount ?? 0;
    const bUnread = groupUnreadById[b.id] ?? b.unreadCount ?? 0;
    if ((aUnread > 0) !== (bUnread > 0)) {
      return aUnread > 0 ? -1 : 1;
    }
    return 0;
  });

  function toggleSelect(memberId: string) {
    setSelectedIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }
      if (current.length >= GROUP_CHAT_MAX_OTHERS) {
        toast.error(`Maksymalnie ${GROUP_CHAT_MAX_OTHERS} osób w grupie.`);
        return current;
      }
      return [...current, memberId];
    });
  }

  function selectAllOthers() {
    if (otherMemberIds.length === 0) {
      toast.error("Brak osób do zaznaczenia.");
      return;
    }

    const next = otherMemberIds.slice(0, GROUP_CHAT_MAX_OTHERS);
    setSelectedIds(next);

    if (otherMemberIds.length > GROUP_CHAT_MAX_OTHERS) {
      toast.message(
        `Zaznaczono ${GROUP_CHAT_MAX_OTHERS} z ${otherMemberIds.length} osób (limit grupy).`,
      );
    }
  }

  function createGroup() {
    if (selectedIds.length < GROUP_CHAT_MIN_OTHERS) {
      toast.error(
        `Zaznacz co najmniej ${GROUP_CHAT_MIN_OTHERS} osoby (Ctrl+klik lub Ctrl+A).`,
      );
      return;
    }

    if (selectedIds.length > GROUP_CHAT_MAX_OTHERS) {
      toast.error(`Maksymalnie ${GROUP_CHAT_MAX_OTHERS} osób w grupie.`);
      return;
    }

    startTransition(async () => {
      const result = await createGroupConversationAction(selectedIds);
      if (
        result.error ||
        !("conversationId" in result) ||
        !result.conversationId
      ) {
        toast.error(result.error ?? "Nie udało się utworzyć grupy.");
        return;
      }

      setSelectedIds([]);
      toast.success("Utworzono grupę.");
      router.push(`/chat?team=${teamId}&group=${result.conversationId}`);
    });
  }

  return (
    <aside
      ref={panelRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.ctrlKey && event.key.toLowerCase() === "a") {
          event.preventDefault();
          selectAllOthers();
        }
      }}
      className="flex w-full shrink-0 flex-col border-t bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:w-72 lg:border-t-0 lg:border-l"
    >
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{teamName ?? "Zespół"}</h3>
        <p className="text-xs text-muted-foreground">
          {online.size} online · {members.length} łącznie
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Klik → DM. Ctrl+klik → zaznacz. Ctrl+A → wszyscy.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            disabled={pending || otherMemberIds.length === 0}
            onClick={() => {
              panelRef.current?.focus();
              selectAllOthers();
            }}
          >
            Zaznacz wszystkich
          </Button>
        </div>
        {selectedIds.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <p className="text-[11px] text-muted-foreground">
              Zaznaczono {selectedIds.length}
              {otherMemberIds.length > 0
                ? ` / ${Math.min(otherMemberIds.length, GROUP_CHAT_MAX_OTHERS)}`
                : null}
            </p>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-7 flex-1"
                disabled={
                  pending || selectedIds.length < GROUP_CHAT_MIN_OTHERS
                }
                onClick={createGroup}
              >
                <Users className="size-3.5" />
                Utwórz grupę
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                disabled={pending}
                onClick={() => setSelectedIds([])}
              >
                Wyczyść
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {groupsSorted.length > 0 ? (
        <div className="border-b px-2 py-2">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Grupy
          </p>
          <ul className="flex flex-col gap-0.5">
            {groupsSorted.map((group) => {
              const active = activeGroupId === group.id;
              const unread =
                groupUnreadById[group.id] ?? group.unreadCount ?? 0;
              const needsReply = unread > 0;

              return (
                <li key={group.id} className="group/item flex items-center gap-0.5">
                  <Link
                    href={`/chat?team=${teamId}&group=${group.id}`}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60",
                      active && "bg-muted",
                    )}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Users className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          needsReply ? "font-semibold" : "font-medium",
                        )}
                      >
                        {group.name}
                        <UnreadBadge count={unread} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {group.members.length} osób
                        {needsReply ? " · odpisz" : null}
                      </p>
                    </div>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover/item:opacity-100"
                    aria-label={`Usuń grupę ${group.name}`}
                    disabled={pending}
                    onClick={() =>
                      setGroupToDelete({ id: group.id, name: group.name })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

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
          const selected = selectedIds.includes(member.id);
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
                    : selected
                      ? "Zaznaczono do grupy"
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
                  onClick={(event) => {
                    if (event.ctrlKey) {
                      event.preventDefault();
                      toggleSelect(member.id);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60",
                    active && "bg-muted",
                    selected && "bg-primary/10 ring-1 ring-primary/40",
                    needsReply && !active && !selected && "bg-destructive/5",
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDeleteDialog
        hideTrigger
        open={groupToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGroupToDelete(null);
          }
        }}
        title="Usunąć grupę?"
        description={
          groupToDelete
            ? `Grupa „${groupToDelete.name}” i cała jej historia znikną dla wszystkich członków.`
            : "Tej operacji nie można cofnąć."
        }
        confirmLabel="Usuń grupę"
        onConfirm={async () => {
          if (!groupToDelete) {
            return;
          }

          const deletingId = groupToDelete.id;
          const result = await deleteGroupConversationAction(deletingId);
          if (result.error) {
            toast.error(result.error);
            return;
          }

          setGroupToDelete(null);
          toast.success("Usunięto grupę.");

          if (activeGroupId === deletingId) {
            router.push(`/chat?team=${teamId}`);
          } else {
            router.refresh();
          }
        }}
      />
    </aside>
  );
}
