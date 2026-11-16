import { SyncStatusPill } from "@/components/sync/SyncStatusPill";
import { formatDayOrdinal, routeTitle } from "@/lib/schedule/format";
import { formatCalendarDate } from "@/lib/time";

/**
 * Journal-style page heading (design doc §6.0):
 * "วันแรก · พฤ. 31 ธ.ค. 2569" above the day's route "ลำพูน → ลำปาง".
 */
export function JournalHeader({
  day,
  totalDays,
  fallback,
}: {
  day: { day_number: number; date: string; title?: string | null } | null;
  totalDays: number;
  /** shown when there is no day (before/after the trip): the trip name */
  fallback: string;
}) {
  const title = (day && routeTitle(day.title)) ?? fallback;
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {day && (
          <p className="font-hand text-[15px] font-semibold text-ink-2">
            {formatDayOrdinal(day.day_number, totalDays)} · {formatCalendarDate(day.date)}
          </p>
        )}
        <h1 className="font-hand text-[28px] leading-[1.3] font-bold break-words">{title}</h1>
      </div>
      <div className="shrink-0 pt-0.5">
        <SyncStatusPill />
      </div>
    </header>
  );
}
