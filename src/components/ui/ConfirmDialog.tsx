"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * Confirmation as a bottom sheet. Built on <dialog> for focus trapping,
 * Escape and inert background; styled to the app's theme.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "ยกเลิก",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        // Tap on the dimmed backdrop
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/45 sm:mx-auto sm:mb-auto sm:max-w-md"
    >
      <div className="mx-auto max-w-md rounded-t-[28px] bg-card px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)] sm:rounded-[28px] sm:pb-5">
        <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
        <h2 id={titleId} className="text-[20px] font-bold">
          {title}
        </h2>
        {message && (
          <p id={messageId} className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {message}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Button variant={destructive ? "danger" : "primary"} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
