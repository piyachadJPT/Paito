"use client";

import { HandIcon } from "@/components/ui/icons";
import { PaperNote } from "@/components/ui/PaperNote";
import { nowPrefs } from "@/hooks/useNowPrefs";
import type { Alert } from "@/lib/schedule/alerts";

/** Sticky in-app alert until closed (SPEC §6), as a taped note. Text only, no sound (Web Push is sent by the server). */
export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <PaperNote key={a.key} role="alert" className="flex min-h-12 items-center gap-2 py-1.5 pr-1 pl-3 text-[15px] font-semibold">
          <HandIcon name="bell" size={20} />
          <p className="min-w-0 flex-1 leading-snug">{a.message}</p>
          <button
            type="button"
            aria-label="ปิดการเตือน"
            onClick={() => nowPrefs.dismissAlert(a.key)}
            className="grid size-11 shrink-0 place-items-center rounded-xl active:bg-warning/15"
          >
            <HandIcon name="close" size={20} />
          </button>
        </PaperNote>
      ))}
    </div>
  );
}
