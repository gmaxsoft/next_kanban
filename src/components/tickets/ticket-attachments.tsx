"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  ImageIcon,
  Paperclip,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/chat-uploads";

export type TicketAttachmentView = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  messageId?: string;
  createdAt?: string;
};

const PREVIEWABLE_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function isPdf(mimeType: string, name: string) {
  return (
    mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")
  );
}

function isOfficeDoc(mimeType: string, name: string) {
  const lower = name.toLowerCase();
  return (
    mimeType.includes("word") ||
    mimeType.includes("officedocument.wordprocessing") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  );
}

function canInlinePreview(mimeType: string, name: string) {
  return PREVIEWABLE_IMAGES.has(mimeType) || isPdf(mimeType, name);
}

function attachmentIcon(mimeType: string, name: string) {
  if (PREVIEWABLE_IMAGES.has(mimeType)) return ImageIcon;
  if (isPdf(mimeType, name) || mimeType.startsWith("text/")) return FileText;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".xls")
  ) {
    return FileSpreadsheet;
  }
  if (mimeType.includes("zip") || mimeType.includes("rar")) return FileArchive;
  return FileIcon;
}

function typeLabel(mimeType: string, name: string) {
  if (PREVIEWABLE_IMAGES.has(mimeType)) return "Obraz";
  if (isPdf(mimeType, name)) return "PDF";
  const lower = name.toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "DOCX";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "XLSX";
  if (isOfficeDoc(mimeType, name)) return "Dokument Office";
  return mimeType.split("/").pop()?.toUpperCase() || "Plik";
}

export function TicketAttachments({
  attachments,
  compact = false,
}: {
  attachments: TicketAttachmentView[];
  compact?: boolean;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const previewAttachment = attachments.find((item) => item.id === previewId);

  return (
    <section
      className={compact ? "mt-3 border-t pt-3" : undefined}
      aria-label="Załączniki"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="size-3.5" />
        Załączniki ({attachments.length})
      </p>
      <ul className="grid gap-2">
        {attachments.map((attachment) => {
          const Icon = attachmentIcon(
            attachment.mimeType,
            attachment.originalName,
          );
          const previewUrl = `/api/tickets/attachments/${attachment.id}?preview=1`;
          const downloadUrl = `/api/tickets/attachments/${attachment.id}`;
          const inline = canInlinePreview(
            attachment.mimeType,
            attachment.originalName,
          );
          const showInlineHere =
            !compact &&
            inline &&
            (PREVIEWABLE_IMAGES.has(attachment.mimeType) ||
              isPdf(attachment.mimeType, attachment.originalName));

          return (
            <li
              key={attachment.id}
              className="overflow-hidden rounded-md border bg-background"
            >
              {showInlineHere && PREVIEWABLE_IMAGES.has(attachment.mimeType) ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setPreviewId(attachment.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={attachment.originalName}
                    loading="lazy"
                    className="max-h-[20rem] w-full bg-muted/30 object-contain"
                  />
                </button>
              ) : showInlineHere &&
                isPdf(attachment.mimeType, attachment.originalName) ? (
                <iframe
                  src={previewUrl}
                  title={`Podgląd: ${attachment.originalName}`}
                  className="h-[24rem] w-full bg-muted/30"
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2 px-2.5 py-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {attachment.originalName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {typeLabel(attachment.mimeType, attachment.originalName)} ·{" "}
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                {inline ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewId(attachment.id)}
                  >
                    <Eye />
                    Podgląd
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={downloadUrl}
                      download={attachment.originalName}
                    />
                  }
                >
                  <Download />
                  Pobierz
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {previewAttachment &&
      canInlinePreview(
        previewAttachment.mimeType,
        previewAttachment.originalName,
      ) ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Podgląd: ${previewAttachment.originalName}`}
          onClick={() => setPreviewId(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setPreviewId(null);
          }}
        >
          <div
            className="relative flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {previewAttachment.originalName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {typeLabel(
                    previewAttachment.mimeType,
                    previewAttachment.originalName,
                  )}{" "}
                  · {formatFileSize(previewAttachment.size)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={`/api/tickets/attachments/${previewAttachment.id}`}
                      download={previewAttachment.originalName}
                    />
                  }
                >
                  <Download />
                  Pobierz
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPreviewId(null)}
                >
                  <X />
                  <span className="sr-only">Zamknij</span>
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
              {PREVIEWABLE_IMAGES.has(previewAttachment.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/tickets/attachments/${previewAttachment.id}?preview=1`}
                  alt={previewAttachment.originalName}
                  className="mx-auto max-h-[80dvh] object-contain p-4"
                />
              ) : (
                <iframe
                  src={`/api/tickets/attachments/${previewAttachment.id}?preview=1`}
                  title={`Podgląd: ${previewAttachment.originalName}`}
                  className="h-[80dvh] w-full"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function TicketAttachmentsPanel({
  attachments,
}: {
  attachments: TicketAttachmentView[];
}) {
  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Brak załączników w tym tickecie.
      </p>
    );
  }

  return <TicketAttachments attachments={attachments} />;
}
