"use client";

import { useActionState, useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  ImageIcon,
  Paperclip,
  Upload,
  X,
} from "lucide-react";

import {
  uploadTaskAttachment,
  type TaskActionState,
} from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatFileSize } from "@/lib/chat-uploads";

export type TaskAttachmentView = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
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

function canInlinePreview(mimeType: string, name: string) {
  return PREVIEWABLE_IMAGES.has(mimeType) || isPdf(mimeType, name);
}

function attachmentIcon(mimeType: string, name: string) {
  if (PREVIEWABLE_IMAGES.has(mimeType)) return ImageIcon;
  if (isPdf(mimeType, name)) return FileText;
  if (
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".xls") ||
    mimeType.includes("spreadsheet")
  ) {
    return FileSpreadsheet;
  }
  return FileIcon;
}

function typeLabel(mimeType: string, name: string) {
  if (PREVIEWABLE_IMAGES.has(mimeType)) return "Obraz";
  if (isPdf(mimeType, name)) return "PDF";
  const lower = name.toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "DOCX";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "XLSX";
  return mimeType.split("/").pop()?.toUpperCase() || "Plik";
}

export function TaskAttachments({
  boardId,
  taskId,
  attachments,
}: {
  boardId: string;
  taskId: string;
  attachments: TaskAttachmentView[];
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<
    TaskActionState,
    FormData
  >(uploadTaskAttachment, null);
  useActionToast(state);

  const previewAttachment = attachments.find((item) => item.id === previewId);

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-3 rounded-xl border p-4">
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="taskId" value={taskId} />
        <div className="grid gap-2">
          <Label htmlFor={`task-file-${taskId}`}>Dodaj załącznik</Label>
          <input
            id={`task-file-${taskId}`}
            name="file"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
          />
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG, DOCX, XLSX (max 20 MB). PDF i obrazy mają podgląd w
            aplikacji.
          </p>
        </div>
        <Button type="submit" disabled={pending} className="w-fit">
          <Upload />
          {pending ? "Wysyłanie..." : "Prześlij plik"}
        </Button>
      </form>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Brak załączników przy tym zadaniu.
        </p>
      ) : (
        <ul className="grid gap-2" aria-label="Załączniki zadania">
          {attachments.map((attachment) => {
            const Icon = attachmentIcon(
              attachment.mimeType,
              attachment.originalName,
            );
            const inline = canInlinePreview(
              attachment.mimeType,
              attachment.originalName,
            );
            return (
              <li
                key={attachment.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2"
              >
                <Paperclip className="size-3.5 text-muted-foreground" />
                <Icon className="size-4 text-muted-foreground" />
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
                      href={`/api/tasks/attachments/${attachment.id}`}
                      download={attachment.originalName}
                    />
                  }
                >
                  <Download />
                  Pobierz
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {previewAttachment &&
      canInlinePreview(
        previewAttachment.mimeType,
        previewAttachment.originalName,
      ) ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="relative flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <p className="truncate text-sm font-medium">
                {previewAttachment.originalName}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPreviewId(null)}
              >
                <X />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
              {PREVIEWABLE_IMAGES.has(previewAttachment.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/tasks/attachments/${previewAttachment.id}?preview=1`}
                  alt={previewAttachment.originalName}
                  className="mx-auto max-h-[80dvh] object-contain p-4"
                />
              ) : (
                <iframe
                  src={`/api/tasks/attachments/${previewAttachment.id}?preview=1`}
                  title={previewAttachment.originalName}
                  className="h-[80dvh] w-full"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
