"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatFileSize } from "@/lib/chat-uploads";
import {
  TICKET_UPLOAD_ACCEPT,
  TICKET_UPLOAD_MAX_BYTES,
  TICKET_UPLOAD_MAX_FILES,
} from "@/lib/ticket-attachments";
import { cn } from "@/lib/utils";

export type TicketMessageAttachmentsFieldHandle = {
  getFiles: () => File[];
  clear: () => void;
};

/** Append selected files into FormData for server actions (avoids brittle input.files sync). */
export function appendTicketUploadFiles(
  formData: FormData,
  handle: TicketMessageAttachmentsFieldHandle | null | undefined,
) {
  formData.delete("files");
  for (const file of handle?.getFiles() ?? []) {
    formData.append("files", file);
  }
  return formData;
}

export const TicketMessageAttachmentsField = forwardRef<
  TicketMessageAttachmentsFieldHandle,
  {
    disabled?: boolean;
    className?: string;
  }
>(function TicketMessageAttachmentsField(
  { disabled = false, className },
  ref,
) {
  const reactId = useId();
  const inputId = `ticket-files-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getFiles: () => files,
    clear: () => {
      setFiles([]);
      setError(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
  }));

  function addFiles(list: FileList | null) {
    if (!list?.length) {
      return;
    }

    setError(null);
    setFiles((current) => {
      const next = [...current];
      for (const file of Array.from(list)) {
        if (file.size <= 0) {
          continue;
        }
        if (file.size > TICKET_UPLOAD_MAX_BYTES) {
          setError(`Plik „${file.name}” przekracza limit 20 MB.`);
          continue;
        }
        if (next.length >= TICKET_UPLOAD_MAX_FILES) {
          setError(`Maksymalnie ${TICKET_UPLOAD_MAX_FILES} załączników.`);
          break;
        }
        const duplicate = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified,
        );
        if (!duplicate) {
          next.push(file);
        }
      }
      return next;
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setError(null);
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={inputId} className="sr-only">
          Załączniki
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || files.length >= TICKET_UPLOAD_MAX_FILES}
          className="w-fit"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip />
          Dodaj załączniki
        </Button>
        <span className="text-xs text-muted-foreground">
          Można wybrać kilka plików (max {TICKET_UPLOAD_MAX_FILES}, 20 MB
          każdy).
        </span>
        {/* Picker only — files are appended to FormData from React state on submit. */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          disabled={disabled}
          accept={TICKET_UPLOAD_ACCEPT}
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {files.length > 0 ? (
        <ul className="grid gap-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">
                {file.name}
                <span className="text-muted-foreground">
                  {" "}
                  · {formatFileSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Usuń ${file.name}`}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => removeFile(index)}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
