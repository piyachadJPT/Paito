"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose(): void;
  /** Prevent closing (e.g. while saving) */
  locked?: boolean;
  /** Hide the × button (confirmations use explicit buttons) */
  hideClose?: boolean;
  describedBy?: string;
  children: ReactNode;
}

/**
 * Sheet from the bottom on phones, centered card on wider screens.
 * Built on <dialog>: focus trap, Escape and inert background for free.
 */
export function BottomSheet({ open, title, onClose, locked = false, hideClose = false, describedBy, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/45 sm:mx-auto sm:mb-auto sm:max-w-md"
    >
      <div className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-[28px] bg-card px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)] sm:rounded-[28px] sm:pb-5">
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-start gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 pt-1.5 text-[20px] font-bold">
            {title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              aria-label="ปิด"
              disabled={locked}
              onClick={onClose}
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 active:bg-card-sunken disabled:opacity-40"
            >
              <X aria-hidden size={22} />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
