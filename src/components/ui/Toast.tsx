"use client";

import { HandIcon } from "@/components/ui/icons";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export const TOAST_DURATION_MS = 8_000;

interface ToastData {
  id: number;
  message: string;
  action?: { label: string; onClick(): void | Promise<void> };
}

interface ToastApi {
  show(message: string, action?: ToastData["action"]): void;
  /** "บันทึกแล้ว · ย้อนกลับ" style toast */
  showUndo(message: string, undo: () => void | Promise<void>): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** One toast at a time, above the tab bar, for 8 s (SPEC §5.5, §10.4). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(0);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, action?: ToastData["action"]) => {
      window.clearTimeout(timer.current);
      setToast({ id: ++seq.current, message, action });
      timer.current = window.setTimeout(dismiss, TOAST_DURATION_MS);
    },
    [dismiss],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const api = useMemo<ToastApi>(
    () => ({ show, showUndo: (message, undo) => show(message, { label: "ย้อนกลับ", onClick: undo }) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 px-4 bottom-[calc(max(12px,env(safe-area-inset-bottom))+76px)]"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto mx-auto flex min-h-12 max-w-md items-center gap-3 rounded-2xl bg-ink py-1.5 pr-1.5 pl-4 text-[15px] text-canvas shadow-[var(--shadow-float)]"
          >
            <HandIcon name="check" size={20} />
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={async () => {
                  const action = toast.action!;
                  dismiss();
                  await action.onClick();
                }}
                className="min-h-11 shrink-0 rounded-xl px-3 font-semibold text-canvas underline-offset-2 active:bg-canvas/15"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
