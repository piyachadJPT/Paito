import { Car, Lock } from "lucide-react";
import { StopTypeIcon } from "@/components/plan/stop-visuals";
import { formatMinutes } from "@/lib/schedule/format";
import { formatTime } from "@/lib/time";
import type { StopRow } from "@/services/data/types";

/** "ต่อไป" card (SPEC §10.3 item 3). */
export function NextCard({ next, timeZone, label = "ต่อไป" }: { next: StopRow; timeZone: string; label?: string }) {
  return (
    <section aria-label={label} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card px-3 py-2.5">
      <StopTypeIcon type={next.stop_type} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold tracking-wide text-ink-2">{label}</p>
        <p className="flex items-center gap-1.5 text-[17px] leading-snug font-semibold">
          <span className="truncate">{next.name}</span>
          {next.is_fixed && <Lock aria-label="ล็อกเวลาถึง" size={14} className="shrink-0 text-ink-2" />}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-2 tabular-nums">
          <Car aria-hidden size={14} />
          {next.travel_minutes === null ? "ยังไม่กรอกเวลาขับ" : `ขับประมาณ ${formatMinutes(next.travel_minutes)}`}
          {next.planned_arrival_at && ` · ถึง ${formatTime(next.planned_arrival_at, timeZone)}`}
        </p>
      </div>
    </section>
  );
}
