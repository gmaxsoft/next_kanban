"use client";

import { Download, FileArchive, FileText, File as FileIcon } from "lucide-react";

import type { ChatAttachmentDto } from "@/lib/chat";
import { formatFileSize, isImageMime } from "@/lib/chat-uploads";
import { cn } from "@/lib/utils";

function fileIcon(mimeType: string) {
  if (mimeType.includes("zip") || mimeType.includes("rar")) {
    return FileArchive;
  }

  if (mimeType.includes("pdf") || mimeType.startsWith("text/")) {
    return FileText;
  }

  return FileIcon;
}

export function ChatAttachments({
  attachments,
  align = "left",
}: {
  attachments: ChatAttachmentDto[];
  align?: "left" | "right";
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <ul
      className={cn(
        "mt-2 grid gap-2",
        align === "right" && "justify-items-end",
      )}
    >
      {attachments.map((attachment) => {
        if (isImageMime(attachment.mimeType)) {
          return (
            <li key={attachment.id} className="max-w-xs overflow-hidden border bg-background">
              <a href={attachment.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={attachment.originalName}
                  className="max-h-56 w-full object-cover"
                />
              </a>
              <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className="truncate">{attachment.originalName}</span>
                <span>{formatFileSize(attachment.size)}</span>
              </div>
            </li>
          );
        }

        const Icon = fileIcon(attachment.mimeType);

        return (
          <li key={attachment.id}>
            <a
              href={attachment.url}
              download={attachment.originalName}
              className="inline-flex max-w-xs items-center gap-2 border bg-background px-2.5 py-2 text-left text-xs hover:bg-muted"
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {attachment.originalName}
                </span>
                <span className="text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
              </span>
              <Download className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
