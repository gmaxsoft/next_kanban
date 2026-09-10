"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Send } from "lucide-react";

import { PresenceList } from "@/components/chat/presence-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CHAT_EVENTS,
  type ChatMember,
  type ChatMessageDto,
  type ChatPresencePayload,
} from "@/lib/chat";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

function socketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ChatRoom({
  currentUserId,
  members,
  initialMessages,
}: {
  currentUserId: string;
  members: ChatMember[];
  initialMessages: ChatMessageDto[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const response = await fetch("/api/chat/token");

      if (!response.ok) {
        setError("Nie udało się pobrać tokenu czatu.");
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
        setConnected(true);
        setError(null);
      });

      socket.on("disconnect", () => {
        setConnected(false);
      });

      socket.on("connect_error", () => {
        setConnected(false);
        setError("Brak połączenia z serwerem czatu. Uruchom `npm run chat`.");
      });

      socket.on(CHAT_EVENTS.message, (message: ChatMessageDto) => {
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }

          return [...current, message];
        });
      });

      socket.on(CHAT_EVENTS.presence, (payload: ChatPresencePayload) => {
        setOnlineUserIds(payload.onlineUserIds);
      });

      socket.on(CHAT_EVENTS.error, (payload: { error?: string }) => {
        setError(payload.error ?? "Nie udało się wysłać wiadomości.");
      });
    }

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    const content = draft.trim();

    if (!content || !socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit(CHAT_EVENTS.send, { content });
    setDraft("");
    setError(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Czat zespołu</h2>
            <p className="text-xs text-muted-foreground">
              Historia z MySQL, nowe wiadomości przez Socket.io
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              connected
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "bg-emerald-500" : "bg-zinc-400",
              )}
            />
            {connected ? "Połączono" : "Offline"}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="m-auto text-sm text-muted-foreground">
              Brak wiadomości. Napisz pierwszą do zespołu.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.author.id === currentUserId;

              return (
                <article
                  key={message.id}
                  className={cn("flex max-w-[85%] gap-2", mine && "ml-auto flex-row-reverse")}
                >
                  <Avatar size="sm" className="mt-0.5 size-8">
                    <AvatarImage
                      src={message.author.avatarUrl ?? undefined}
                      alt={message.author.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(message.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("min-w-0", mine && "text-right")}>
                    <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-xs font-medium">{message.author.name}</span>
                      <time
                        className="text-[11px] text-muted-foreground"
                        dateTime={message.createdAt}
                      >
                        {formatTime(message.createdAt)}
                      </time>
                    </div>
                    <p
                      className={cn(
                        "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-5",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {message.content}
                    </p>
                  </div>
                </article>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="grid gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={
                connected
                  ? "Napisz wiadomość… (Enter wyśle, Shift+Enter nowa linia)"
                  : "Czat jest offline"
              }
              maxLength={2000}
              rows={2}
              disabled={!connected}
              className="min-h-[2.75rem] flex-1"
            />
            <Button type="submit" disabled={!connected || !draft.trim()} className="shrink-0">
              <Send />
              Wyślij
            </Button>
          </div>
        </form>
      </section>

      <PresenceList
        members={members}
        onlineUserIds={onlineUserIds}
        currentUserId={currentUserId}
        connected={connected}
      />
    </div>
  );
}
