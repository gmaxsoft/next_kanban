"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import { CHAT_EVENTS, type ChatMessageDto } from "@/lib/chat";
import {
  flashDocumentTitle,
  stopDocumentTitleFlash,
} from "@/lib/tab-attention";

type ChatSocketContextValue = {
  unreadCount: number;
  setUnreadCount: (value: number | ((prev: number) => number)) => void;
};

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function socketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
}

export function ChatSocketProvider({
  currentUserId,
  teamIds,
  initialUnreadCount,
  children,
}: {
  currentUserId: string;
  teamIds: string[];
  initialUnreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const socketRef = useRef<Socket | null>(null);
  const activeTeamRef = useRef<string | null>(null);
  const currentUserRef = useRef(currentUserId);
  const teamIdsKey = teamIds.join(",");

  currentUserRef.current = currentUserId;

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    const onChat = pathname.startsWith("/chat");
    const teamId = onChat ? searchParams.get("team") : null;
    activeTeamRef.current = teamId;

    if (onChat) {
      stopDocumentTitleFlash();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const response = await fetch("/api/chat/token");
        if (!response.ok || cancelled) {
          return;
        }

        const { token } = (await response.json()) as { token: string };
        if (cancelled) {
          return;
        }

        const socket = io(socketUrl(), {
          auth: { token },
          transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          if (teamIds.length > 0) {
            socket.emit(CHAT_EVENTS.join, { teamIds });
          }
        });

        socket.on(CHAT_EVENTS.message, (message: ChatMessageDto) => {
          if (message.author.id === currentUserRef.current) {
            return;
          }

          const viewingThisTeam = activeTeamRef.current === message.teamId;
          const tabInBackground =
            typeof document !== "undefined" &&
            (document.visibilityState === "hidden" || !document.hasFocus());

          // Viewing this team in a focused tab — ChatReadMarker clears via server.
          if (viewingThisTeam && !tabInBackground) {
            return;
          }

          if (!viewingThisTeam) {
            setUnreadCount((current) => current + 1);
          }

          if (tabInBackground) {
            const preview =
              message.content.trim().slice(0, 40) || "nowa wiadomość";
            flashDocumentTitle(
              `(1) Czat · ${message.author.name}: ${preview}`,
            );
          }
        });
      } catch {
        // Soft-fail — ChatRoom still connects for messaging.
      }
    }

    void connect();

    return () => {
      cancelled = true;
      stopDocumentTitleFlash();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [teamIdsKey, teamIds]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
    }),
    [unreadCount],
  );

  return (
    <ChatSocketContext.Provider value={value}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return context;
}

export function useChatUnreadCount(fallback = 0) {
  const context = useContext(ChatSocketContext);
  return context?.unreadCount ?? fallback;
}
