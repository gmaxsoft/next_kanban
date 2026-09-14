"use client";

import { useState } from "react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
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
import { looksLikeHtml, normalizeRichTextInput } from "@/lib/rich-text";

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
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
}) {
  const [html, setHtml] = useState(() =>
    normalizeRichTextInput(toEditorContent(defaultValue)),
  );
  const [, setToolbarTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorContent(defaultValue),
    onUpdate: ({ editor: current }) => {
      setHtml(normalizeRichTextInput(current.getHTML()));
      setToolbarTick((tick) => tick + 1);
    },
    onSelectionUpdate: () => {
      setToolbarTick((tick) => tick + 1);
    },
    onCreate: ({ editor: current }) => {
      setHtml(normalizeRichTextInput(current.getHTML()));
    },
    editorProps: {
      attributes: {
        id: id ?? name,
        class: cn(
          "prose-editor max-w-none px-3 py-2 text-sm outline-none focus-visible:outline-none",
          minHeightClassName,
        ),
      },
    },
  });

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
    </div>
  );
}
