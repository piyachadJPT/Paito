import { HandIcon } from "@/components/ui/icons";
import { Stamp } from "@/components/ui/Stamp";
import { formatDayOrdinal } from "@/lib/schedule/format";
import { formatCalendarDate, formatTime } from "@/lib/time";
import type { DayRow, StopRow } from "@/services/data/types";

/**
 * Day header as a travel ticket taped into the journal (U6): notched sides,
 * dashed tear line, route "from → to", departure and arrival at the lodging,
 * and a red stamp with the day.
 */
export function DayTicket({ day, stops, timeZone, totalDays }: { day: DayRow; stops: StopRow[]; timeZone: string; totalDays: number }) {
  const origin = stops[0];
  const last = stops.length > 1 ? stops[stops.length - 1] : null;
  const departure = origin?.planned_departure_at;
  const arrival = last?.planned_arrival_at;
  const places = stops.slice(1).filter((s) => s.stop_type === "sight" || s.stop_type === "food").length;

  return (
    <section aria-label={`Day ${day.day_number}`} className="relative mt-4 rotate-[-0.6deg] rounded-[6px] bg-card shadow-[var(--shadow-card)]">
      {/* washi tape */}
      <span
        aria-hidden
        className="absolute -top-3 left-8 h-6 w-[76px] -rotate-3 bg-[rgb(222_184_110/0.6)] [clip-path:polygon(3%_0,97%_4%,100%_50%,96%_100%,2%_96%,0_45%)]"
      />
      {/* notches on the tear line */}
      <span aria-hidden className="absolute bottom-[53px] -left-[9px] size-[18px] rounded-full bg-canvas" />
      <span aria-hidden className="absolute bottom-[53px] -right-[9px] size-[18px] rounded-full bg-canvas" />

      <div className="flex gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold tracking-[0.08em] text-primary">
            DAY {day.day_number} · {formatCalendarDate(day.date)}
          </p>
          {day.title && <h2 className="mt-1 font-hand text-[20px] leading-[1.35] font-bold break-words">{day.title}</h2>}
          {origin && last && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink-2">
              <span className="truncate">{origin.name}</span>
              <HandIcon name="navigate" size={14} className="rotate-45" />
              <span className="truncate">{last.name}</span>
            </p>
          )}
        </div>
        <Stamp size="sm" tone="red" rotate={10} className="mt-1">
          {formatDayOrdinal(day.day_number, totalDays)}
        </Stamp>
      </div>

      <div aria-hidden className="mx-4 border-t-2 border-dashed border-line-strong" />

      <dl className="grid h-[62px] grid-cols-3 items-center px-4 text-center">
        <div>
          <dt className="font-hand text-[13px] text-ink-2">ออก</dt>
          <dd className="text-[17px] font-bold tabular-nums">{departure ? formatTime(departure, timeZone) : "—"}</dd>
        </div>
        <div className="border-x border-dashed border-line-strong">
          <dt className="font-hand text-[13px] text-ink-2">ถึงที่พัก</dt>
          <dd className="text-[17px] font-bold tabular-nums">{arrival ? formatTime(arrival, timeZone) : "—"}</dd>
        </div>
        <div>
          <dt className="font-hand text-[13px] text-ink-2">สถานที่</dt>
          <dd className="text-[17px] font-bold tabular-nums">{places} จุด</dd>
        </div>
      </dl>
    </section>
  );
}
