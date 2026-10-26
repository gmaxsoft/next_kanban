"use client";

import { useEffect } from "react";

import {
  markChatTeamAsRead,
  markDirectConversationAsRead,
} from "@/app/actions/chat";
import { useChatSocket } from "@/components/chat/chat-socket-provider";

/** Marks the active chat thread as read and syncs the sidebar badge. */
export function ChatReadMarker({
  teamId,
  conversationId,
  messageCount,
}: {
  teamId?: string;
  conversationId?: string;
  /** Bumps when new messages arrive while viewing this thread. */
  messageCount: number;
}) {
  const { setUnreadCount } = useChatSocket();

  useEffect(() => {
    if (!teamId && !conversationId) {
      return;
    }

    let cancelled = false;

    const action = conversationId
      ? markDirectConversationAsRead(conversationId)
      : markChatTeamAsRead(teamId!);

    void action.then((result) => {
      if (cancelled || result.error || result.unreadCount === undefined) {
        return;
      }

      setUnreadCount(result.unreadCount);
    });

    return () => {
      cancelled = true;
    };
  }, [teamId, conversationId, messageCount, setUnreadCount]);

  return null;
}
