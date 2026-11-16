import { StopTypeIcon } from "@/components/plan/stop-visuals";
import { HandIcon } from "@/components/ui/icons";
import { formatMinutes } from "@/lib/schedule/format";
import { formatTime } from "@/lib/time";
import type { StopRow } from "@/services/data/types";

/** "ต่อไป" (SPEC §10.3 item 3) as a ticket stub torn along a perforation. */
export function NextCard({ next, timeZone, label = "ต่อไป" }: { next: StopRow; timeZone: string; label?: string }) {
  return (
    <section aria-label={label} className="relative flex items-stretch rounded-[6px] bg-card shadow-[0_3px_10px_rgb(60_40_10/0.12)]">
      <div className="grid w-16 shrink-0 place-items-center">
        <StopTypeIcon type={next.stop_type} size={40} />
      </div>
      {/* perforation: dashed line with a notch at each end */}
      <div aria-hidden className="relative border-l-2 border-dashed border-line-strong">
        <span className="absolute -top-[7px] -left-[8px] size-[14px] rounded-full bg-canvas" />
        <span className="absolute -bottom-[7px] -left-[8px] size-[14px] rounded-full bg-canvas" />
      </div>
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className="font-hand text-[13px] font-semibold text-ink-2">{label}</p>
        <p className="flex items-center gap-1.5 text-[17px] leading-snug font-semibold">
          <span className="truncate">{next.name}</span>
          {next.is_fixed && <HandIcon name="lock" size={15} aria-label="ล็อกเวลาถึง" className="text-ink-2" />}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-2 tabular-nums">
          <HandIcon name="car" size={16} />
          {next.travel_minutes === null ? "ยังไม่กรอกเวลาขับ" : `ขับประมาณ ${formatMinutes(next.travel_minutes)}`}
          {next.planned_arrival_at && ` · ถึง ${formatTime(next.planned_arrival_at, timeZone)}`}
        </p>
      </div>
    </section>
  );
}
