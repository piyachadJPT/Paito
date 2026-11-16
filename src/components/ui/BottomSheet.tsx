"use client";

import { HandIcon } from "@/components/ui/icons";
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
 * A taped sheet of journal paper from the bottom on phones, centered card on wider screens.
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
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-[rgb(40_30_10/0.45)] sm:mx-auto sm:mb-auto sm:max-w-md"
    >
      <div className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-[14px] bg-card px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)] sm:rounded-[14px] sm:pb-5">
        {/* washi tape doubles as the grab handle */}
        <div
          aria-hidden
          className="mx-auto mb-3 h-4 w-16 -rotate-2 bg-[rgb(222_184_110/0.6)] [clip-path:polygon(4%_0,96%_6%,100%_50%,95%_100%,3%_94%,0_45%)]"
        />
        <div className="flex items-start gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 pt-1 font-hand text-[24px] leading-[1.35] font-bold break-words">
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
              <HandIcon name="close" size={22} />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
