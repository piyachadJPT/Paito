"use client";

import { FlaskConical } from "lucide-react";
import { useClockSimulated, useNow } from "@/hooks/useNow";
import { clock } from "@/lib/clock";
import { DEFAULT_TIMEZONE, formatDayMonth, formatTime } from "@/lib/time";

/**
 * Always-visible strip while the simulated clock is on, so it is never
 * forgotten during the real trip.
 */
export function ClockBanner({ timeZone = DEFAULT_TIMEZONE }: { timeZone?: string }) {
  const simulated = useClockSimulated();
  const now = useNow();
  if (!simulated || !now) return null;

  return (
    <div
      role="status"
      className="mx-4 mt-2 flex min-h-11 items-center gap-2 rounded-2xl border border-warning/40 bg-warning-soft py-1.5 pr-1.5 pl-3 text-sm text-warning-ink"
    >
      <FlaskConical aria-hidden size={18} strokeWidth={2.2} className="shrink-0" />
      <p className="min-w-0 flex-1 leading-tight">
        <span className="font-semibold">นาฬิกาจำลอง</span>{" "}
        <span className="tabular-nums">
          {formatDayMonth(now, timeZone)} {formatTime(now, timeZone)}
        </span>
      </p>
      <button
        type="button"
        onClick={() => clock.reset()}
        className="min-h-11 shrink-0 rounded-xl px-3 font-semibold active:bg-warning/15"
      >
        ใช้เวลาจริง
      </button>
    </div>
  );
}
