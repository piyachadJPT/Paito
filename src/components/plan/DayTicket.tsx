import { ArrowRight } from "lucide-react";
import { formatCalendarDate, formatTime } from "@/lib/time";
import type { DayRow, StopRow } from "@/services/data/types";

/**
 * Day header styled as a travel ticket (U6): notched sides, dashed tear line,
 * route "from → to", departure and arrival at tonight's lodging.
 */
export function DayTicket({ day, stops, timeZone }: { day: DayRow; stops: StopRow[]; timeZone: string }) {
  const origin = stops[0];
  const last = stops.length > 1 ? stops[stops.length - 1] : null;
  const departure = origin?.planned_departure_at;
  const arrival = last?.planned_arrival_at;
  const places = stops.slice(1).filter((s) => s.stop_type === "sight" || s.stop_type === "food").length;

  return (
    <section aria-label={`Day ${day.day_number}`} className="relative mt-3 rounded-[20px] border border-line bg-card">
      {/* notches */}
      <span aria-hidden className="absolute top-[62%] -left-[9px] size-[18px] -translate-y-1/2 rounded-full border border-line bg-canvas [clip-path:inset(0_0_0_50%)]" />
      <span aria-hidden className="absolute top-[62%] -right-[9px] size-[18px] -translate-y-1/2 rounded-full border border-line bg-canvas [clip-path:inset(0_50%_0_0)]" />

      <div className="px-4 pt-3.5 pb-3">
        <p className="text-[13px] font-semibold tracking-wide text-primary">
          DAY {day.day_number} · {formatCalendarDate(day.date)}
        </p>
        {day.title && <h2 className="mt-1 text-[18px] leading-snug font-bold">{day.title}</h2>}
        {origin && last && (
          <p className="mt-2 flex items-center gap-1.5 text-[15px] text-ink-2">
            <span className="truncate">{origin.name}</span>
            <ArrowRight aria-hidden size={15} className="shrink-0" />
            <span className="truncate">{last.name}</span>
          </p>
        )}
      </div>

      <div aria-hidden className="mx-3 border-t-2 border-dashed border-line" />

      <dl className="grid grid-cols-3 px-4 py-3 text-center">
        <div>
          <dt className="text-[12px] text-ink-2">ออก</dt>
          <dd className="text-[17px] font-bold tabular-nums">{departure ? formatTime(departure, timeZone) : "—"}</dd>
        </div>
        <div className="border-x border-line">
          <dt className="text-[12px] text-ink-2">ถึงที่พัก</dt>
          <dd className="text-[17px] font-bold tabular-nums">{arrival ? formatTime(arrival, timeZone) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-2">สถานที่</dt>
          <dd className="text-[17px] font-bold tabular-nums">{places} จุด</dd>
        </div>
      </dl>
    </section>
  );
}
