"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";

import { ChatAttachments } from "@/components/chat/chat-attachments";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { PresenceList } from "@/components/chat/presence-list";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CHAT_EVENTS,
  type ChatMember,
  type ChatMessageDto,
  type ChatPresencePayload,
  type ChatTeamOption,
} from "@/lib/chat";
import {
  CHAT_UPLOAD_MAX_FILES,
  formatFileSize,
  type StoredChatFile,
} from "@/lib/chat-uploads";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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
  teamId,
  teams,
  members,
  initialMessages,
}: {
  currentUserId: string;
  teamId: string;
  teams: ChatTeamOption[];
  members: ChatMember[];
  initialMessages: ChatMessageDto[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<StoredChatFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToRemove, setFileToRemove] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, teamId]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const response = await fetch("/api/chat/token");

      if (!response.ok) {
        setError("Nie udało się pobrać tokenu czatu.");
        toast.error("Nie udało się pobrać tokenu czatu.");
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
        socket.emit(CHAT_EVENTS.join, { teamId });
      });

      socket.on("disconnect", () => {
        setConnected(false);
      });

      socket.on("connect_error", () => {
        setConnected(false);
        const message =
          "Brak połączenia z serwerem czatu. Uruchom `npm run chat`.";
        setError(message);
        toast.error(message);
      });

      socket.on(CHAT_EVENTS.message, (message: ChatMessageDto) => {
        if (message.teamId !== teamId) {
          return;
        }

        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }

          return [...current, message];
        });
      });

      socket.on(CHAT_EVENTS.presence, (payload: ChatPresencePayload) => {
        if (payload.teamId !== teamId) {
          return;
        }

        setOnlineUserIds(payload.onlineUserIds);
      });

      socket.on(CHAT_EVENTS.error, (payload: { error?: string }) => {
        const message = payload.error ?? "Nie udało się wysłać wiadomości.";
        setError(message);
        toast.error(message);
      });
    }

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraft((value) => `${value}${emoji}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + emoji.length;
      textarea.setSelectionRange(caret, caret);
    });
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const remaining = CHAT_UPLOAD_MAX_FILES - pendingFiles.length;
    if (remaining <= 0) {
      setError(`Maksymalnie ${CHAT_UPLOAD_MAX_FILES} załączników.`);
      toast.error(`Maksymalnie ${CHAT_UPLOAD_MAX_FILES} załączników.`);
      return;
    }

    const selected = [...fileList].slice(0, remaining);
    const body = new FormData();
    for (const file of selected) {
      body.append("files", file);
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        files?: StoredChatFile[];
        error?: string;
      };

      if (!response.ok || !data.files) {
        const message = data.error ?? "Nie udało się wgrać plików.";
        setError(message);
        toast.error(message);
        return;
      }

      setPendingFiles((current) => [...current, ...data.files!]);
      toast.success("Dodano załączniki.");
    } catch {
      setError("Nie udało się wgrać plików.");
      toast.error("Nie udało się wgrać plików.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function send() {
    const content = draft.trim();

    if (
      (!content && pendingFiles.length === 0) ||
      !socketRef.current?.connected ||
      uploading
    ) {
      return;
    }

    socketRef.current.emit(CHAT_EVENTS.send, {
      teamId,
      content,
      attachments: pendingFiles,
    });
    setDraft("");
    setPendingFiles([]);
    setError(null);
  }

  const activeTeam = teams.find((team) => team.id === teamId);
  const canSend =
    connected &&
    !uploading &&
    (draft.trim().length > 0 || pendingFiles.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border bg-card shadow-sm lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold">
                Czat · {activeTeam?.name ?? "Zespół"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Wybierz zespół, żeby rozmawiać z jego członkami.
              </p>
            </div>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Aktywny zespół
              <select
                className={selectClassName}
                value={teamId}
                onChange={(event) => {
                  router.replace(`/chat?team=${event.target.value}`);
                }}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium",
              connected
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            <span
              className={cn(
                "size-1.5",
                connected ? "bg-emerald-500" : "bg-zinc-400",
              )}
            />
            {connected ? "Połączono" : "Offline"}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="m-auto text-sm text-muted-foreground">
              Brak wiadomości w tym zespole. Napisz pierwszą.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.author.id === currentUserId;

              return (
                <article
                  key={message.id}
                  className={cn(
                    "flex max-w-[85%] gap-2",
                    mine && "ml-auto flex-row-reverse",
                  )}
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
                      <span className="text-xs font-medium">
                        {message.author.name}
                      </span>
                      <time
                        className="text-[11px] text-muted-foreground"
                        dateTime={message.createdAt}
                      >
                        {formatTime(message.createdAt)}
                      </time>
                    </div>
                    {message.content ? (
                      <p
                        className={cn(
                          "whitespace-pre-wrap px-3 py-2 text-sm leading-5",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {message.content}
                      </p>
                    ) : null}
                    <ChatAttachments
                      attachments={message.attachments}
                      align={mine ? "right" : "left"}
                    />
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

          {pendingFiles.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {pendingFiles.map((file) => (
                <li
                  key={file.fileName}
                  className="inline-flex max-w-full items-center gap-2 border bg-muted/40 px-2 py-1 text-xs"
                >
                  <span className="truncate">
                    {file.originalName} · {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Usuń ${file.originalName}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setFileToRemove(file.fileName)}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-end gap-2">
            <div className="flex shrink-0 items-center gap-1 pb-1">
              <EmojiPicker disabled={!connected} onSelect={insertEmoji} />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!connected || uploading || pendingFiles.length >= CHAT_UPLOAD_MAX_FILES}
                aria-label="Dodaj załącznik"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.rar,.txt,.doc,.docx,.xls,.xlsx,image/*,application/pdf,application/zip"
                onChange={(event) => void onFilesSelected(event.target.files)}
              />
            </div>
            <Textarea
              ref={textareaRef}
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
                  ? "Napisz wiadomość… (emoji, Enter wyśle)"
                  : "Czat jest offline"
              }
              maxLength={2000}
              rows={2}
              disabled={!connected}
              className="min-h-[2.75rem] flex-1"
            />
            <Button type="submit" disabled={!canSend} className="shrink-0">
              <Send />
              {uploading ? "Wgrywanie..." : "Wyślij"}
            </Button>
          </div>
        </form>
      </section>

      <PresenceList
        members={members}
        onlineUserIds={onlineUserIds}
        currentUserId={currentUserId}
        connected={connected}
        teamName={activeTeam?.name}
      />

      <ConfirmDeleteDialog
        hideTrigger
        open={fileToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFileToRemove(null);
          }
        }}
        title="Usunąć załącznik?"
        description="Plik zostanie usunięty z kolejki przed wysłaniem."
        onConfirm={() => {
          if (!fileToRemove) {
            return;
          }
          setPendingFiles((current) =>
            current.filter((item) => item.fileName !== fileToRemove),
          );
          setFileToRemove(null);
          toast.success("Usunięto załącznik z kolejki.");
        }}
      />
    </div>
  );
}
