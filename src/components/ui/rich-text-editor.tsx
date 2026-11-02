"use client";

import { useEffect, useRef, useState } from "react";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";
import {
  looksLikeHtml,
  normalizeRichTextInput,
  type SanitizeRichTextOptions,
} from "@/lib/rich-text";

function toEditorContent(value?: string) {
  if (!value?.trim()) {
    return "";
  }
  if (looksLikeHtml(value)) {
    return value;
  }
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

async function uploadNoteImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/tickets/note-images", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Nie udało się wgrać zdjęcia.");
  }

  return payload.url;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "bg-muted")}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  name,
  id,
  defaultValue = "",
  placeholder = "Napisz opis...",
  className,
  minHeightClassName = "min-h-36",
  enableImages = false,
  resetKey,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  enableImages?: boolean;
  resetKey?: string | number | boolean | null;
}) {
  const sanitizeOptions: SanitizeRichTextOptions = {
    allowImages: enableImages,
  };
  const [html, setHtml] = useState(() =>
    normalizeRichTextInput(toEditorContent(defaultValue), sanitizeOptions),
  );
  const [, setToolbarTick] = useState(0);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Link i Underline są już w StarterKit — konfigurujemy tu, bez osobnych importów.
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({ placeholder }),
      ...(enableImages
        ? [
            Image.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: {
                class: "max-h-80 rounded-md border",
              },
            }),
          ]
        : []),
    ],
    content: toEditorContent(defaultValue),
    onUpdate: ({ editor: current }) => {
      setHtml(normalizeRichTextInput(current.getHTML(), sanitizeOptions));
      setToolbarTick((tick) => tick + 1);
    },
    onSelectionUpdate: () => {
      setToolbarTick((tick) => tick + 1);
    },
    onCreate: ({ editor: current }) => {
      editorRef.current = current;
      setHtml(normalizeRichTextInput(current.getHTML(), sanitizeOptions));
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        id: id ?? name,
        class: cn(
          "prose-editor max-w-none px-3 py-2 text-sm outline-none focus-visible:outline-none",
          minHeightClassName,
        ),
      },
      handlePaste: (_view, event) => {
        if (!enableImages) {
          return false;
        }

        const currentEditor = editorRef.current;
        if (!currentEditor) {
          return false;
        }

        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (!imageItem) {
          return false;
        }

        const file = imageItem.getAsFile();
        if (!file) {
          return false;
        }

        event.preventDefault();
        void (async () => {
          try {
            setUploading(true);
            const url = await uploadNoteImage(file);
            currentEditor.chain().focus().setImage({ src: url }).run();
          } catch (error) {
            window.alert(
              error instanceof Error
                ? error.message
                : "Nie udało się wkleić zdjęcia.",
            );
          } finally {
            setUploading(false);
          }
        })();

        return true;
      },
      handleDrop: (_view, event) => {
        if (!enableImages) {
          return false;
        }

        const currentEditor = editorRef.current;
        if (!currentEditor) {
          return false;
        }

        const files = Array.from(event.dataTransfer?.files ?? []).filter(
          (file) => file.type.startsWith("image/"),
        );
        if (files.length === 0) {
          return false;
        }

        event.preventDefault();
        void (async () => {
          try {
            setUploading(true);
            for (const file of files) {
              const url = await uploadNoteImage(file);
              currentEditor.chain().focus().setImage({ src: url }).run();
            }
          } catch (error) {
            window.alert(
              error instanceof Error
                ? error.message
                : "Nie udało się dodać zdjęcia.",
            );
          } finally {
            setUploading(false);
          }
        })();

        return true;
      },
    },
  });

  useEffect(() => {
    if (resetKey === undefined || resetKey === null || !editor) {
      return;
    }
    editor.commands.clearContent(true);
    setHtml("");
  }, [resetKey, editor]);

  async function insertImageFromFile(file: File | undefined) {
    if (!file || !editor) {
      return;
    }
    try {
      setUploading(true);
      const url = await uploadNoteImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Nie udało się wgrać zdjęcia.",
      );
    } finally {
      setUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      <input type="hidden" name={name} value={html} readOnly />

      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/40 p-1">
        <ToolbarButton
          label="Pogrubienie"
          active={editor?.isActive("bold")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Kursywa"
          active={editor?.isActive("italic")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Podkreślenie"
          active={editor?.isActive("underline")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Przekreślenie"
          active={editor?.isActive("strike")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolbarButton>
        <ToolbarButton
          label="Nagłówek 2"
          active={editor?.isActive("heading", { level: 2 })}
          disabled={!editor}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          label="Nagłówek 3"
          active={editor?.isActive("heading", { level: 3 })}
          disabled={!editor}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 />
        </ToolbarButton>
        <ToolbarButton
          label="Lista punktowana"
          active={editor?.isActive("bulletList")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerowana"
          active={editor?.isActive("orderedList")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          label="Cytat"
          active={editor?.isActive("blockquote")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor?.isActive("link")}
          disabled={!editor}
          onClick={() => {
            if (!editor) {
              return;
            }
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            const previous = editor.getAttributes("link").href as
              | string
              | undefined;
            const url = window.prompt("Adres URL", previous ?? "https://");
            if (!url) {
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }}
        >
          <Link2 />
        </ToolbarButton>
        {enableImages ? (
          <>
            <ToolbarButton
              label="Dodaj zdjęcie"
              disabled={!editor || uploading}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon />
            </ToolbarButton>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(event) => {
                void insertImageFromFile(event.target.files?.[0]);
              }}
            />
          </>
        ) : null}
        <div className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton
          label="Cofnij"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Ponów"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      {enableImages && uploading ? (
        <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
          Wgrywanie zdjęcia…
        </p>
      ) : null}
    </div>
  );
}
