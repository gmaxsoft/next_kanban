"use client";

import { useEffect } from "react";

import { markChatTeamAsRead } from "@/app/actions/chat";
import { useChatSocket } from "@/components/chat/chat-socket-provider";

/** Marks the active chat team as read and syncs the sidebar badge. */
export function ChatReadMarker({
  teamId,
  messageCount,
}: {
  teamId: string;
  /** Bumps when new messages arrive while viewing this team. */
  messageCount: number;
}) {
  const { setUnreadCount } = useChatSocket();

  useEffect(() => {
    if (!teamId) {
      return;
    }

    let cancelled = false;

    void markChatTeamAsRead(teamId).then((result) => {
      if (cancelled || result.error || result.unreadCount === undefined) {
        return;
      }

      setUnreadCount(result.unreadCount);
    });

    return () => {
      cancelled = true;
    };
  }, [teamId, messageCount, setUnreadCount]);

  return null;
}
