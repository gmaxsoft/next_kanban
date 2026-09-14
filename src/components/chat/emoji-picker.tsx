"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🔥",
  "✅",
  "❌",
  "⭐",
  "💡",
  "📌",
  "📎",
  "📦",
  "🚀",
  "🎉",
  "☕",
  "💻",
  "🐛",
  "🛠️",
] as const;

export function EmojiPicker({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label="Emotikony"
        onClick={() => setOpen((value) => !value)}
      >
        <Smile />
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute bottom-full left-0 z-20 mb-2 grid w-64 grid-cols-6 gap-1 border bg-popover p-2 shadow-md",
          )}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex size-9 items-center justify-center text-lg hover:bg-muted"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
