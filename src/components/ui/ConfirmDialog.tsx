"use client";

import { useId } from "react";
import { BottomSheet } from "./BottomSheet";
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

/** Confirmation as a bottom sheet. */
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
  const messageId = useId();
  return (
    <BottomSheet open={open} title={title} onClose={onCancel} locked={busy} hideClose describedBy={message ? messageId : undefined}>
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
    </BottomSheet>
  );
}
