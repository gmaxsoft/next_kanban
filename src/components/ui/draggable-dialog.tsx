"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

function DraggableDialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="draggable-dialog" {...props} />;
}

function DraggableDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger data-slot="draggable-dialog-trigger" {...props} />
  );
}

function DraggableDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return (
    <DialogPrimitive.Portal data-slot="draggable-dialog-portal" {...props} />
  );
}

function DraggableDialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="draggable-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

function DraggableDialogContent({
  className,
  children,
  title,
  description,
  open,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  title: React.ReactNode;
  description?: React.ReactNode;
  open?: boolean;
  showCloseButton?: boolean;
}) {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  React.useEffect(() => {
    if (open) {
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <DraggableDialogPortal>
      <DraggableDialogOverlay />
      <DialogPrimitive.Popup
        data-slot="draggable-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,40rem)] w-[min(calc(100vw-1.5rem),28rem)] flex-col overflow-hidden rounded-xl border border-border/80 bg-popover text-sm text-popover-foreground shadow-2xl outline-none data-ending-style:opacity-0 data-starting-style:opacity-0",
          className,
        )}
        style={{
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        }}
        {...props}
      >
        <div
          data-slot="draggable-dialog-header"
          className="flex cursor-grab items-start gap-3 border-b border-border/80 bg-muted/50 px-4 py-3 active:cursor-grabbing touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="font-heading text-base leading-snug font-medium">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {showCloseButton ? (
            <div
              className="shrink-0"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <DialogPrimitive.Close
                data-slot="draggable-dialog-close"
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <XIcon />
                <span className="sr-only">Zamknij</span>
              </DialogPrimitive.Close>
            </div>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Popup>
    </DraggableDialogPortal>
  );
}

export {
  DraggableDialog,
  DraggableDialogTrigger,
  DraggableDialogContent,
};
