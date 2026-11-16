"use client";

import { BellRing, X } from "lucide-react";
import { nowPrefs } from "@/hooks/useNowPrefs";
import type { Alert } from "@/lib/schedule/alerts";

/** Sticky in-app alert until closed (SPEC §6). Text only — no sound, no notifications. */
export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div
          key={a.key}
          role="alert"
          className="flex min-h-12 items-center gap-2 rounded-2xl border border-warning/40 bg-warning-soft py-1.5 pr-1 pl-3 text-[15px] font-semibold text-warning-ink"
        >
          <BellRing aria-hidden size={18} className="shrink-0" />
          <p className="min-w-0 flex-1 leading-snug">{a.message}</p>
          <button
            type="button"
            aria-label="ปิดการเตือน"
            onClick={() => nowPrefs.dismissAlert(a.key)}
            className="grid size-11 shrink-0 place-items-center rounded-xl active:bg-warning/15"
          >
            <X aria-hidden size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}
