import type { TicketMessageKind } from "@prisma/client";

import { MentionBody } from "@/components/mentions/mention-body";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

export type TicketMessageView = {
  id: string;
  kind: TicketMessageKind;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

const kindLabel: Record<TicketMessageKind, string> = {
  INBOUND: "E-mail od klienta",
  OUTBOUND: "Odpowiedź e-mail",
  INTERNAL: "Notatka wewnętrzna",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function TicketConversation({
  messages,
}: {
  messages: TicketMessageView[];
}) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Brak wiadomości w wątku.</p>
    );
  }

  return (
    <ul className="grid gap-3">
      {messages.map((message) => {
        const authorName =
          message.author?.name ||
          message.fromName ||
          message.fromEmail ||
          "System";

        return (
          <li
            key={message.id}
            className={cn(
              "rounded-xl border p-4",
              message.kind === "INTERNAL" && "border-dashed bg-muted/30",
              message.kind === "OUTBOUND" && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarImage
                    src={message.author?.avatarUrl ?? undefined}
                    alt={authorName}
                  />
                  <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{authorName}</p>
                  {message.fromEmail ? (
                    <p className="text-xs text-muted-foreground">
                      {message.fromEmail}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline">{kindLabel[message.kind]}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(message.createdAt)}
                </span>
              </div>
            </div>

            {message.subject ? (
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {message.subject}
              </p>
            ) : null}

            {message.bodyHtml && message.kind === "INBOUND" ? (
              <div
                className="prose-editor max-w-none text-sm leading-6"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
            ) : message.bodyText ? (
              <MentionBody content={message.bodyText} />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6">
                (brak treści)
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
