import Link from "next/link";
import { StatusChip } from "@/components/plan/stop-visuals";
import { formatTime } from "@/lib/time";
import type { StopRow } from "@/services/data/types";

/** Compact list of the day (SPEC §10.3 item 7) — may sit below the fold. */
export function TodayList({ stops, dayNumber, timeZone }: { stops: StopRow[]; dayNumber: number; timeZone: string }) {
  if (stops.length === 0) return null;
  return (
    <section aria-labelledby="today-heading" className="mt-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 id="today-heading" className="text-[13px] font-semibold tracking-wide text-ink-2">
          แผนของวันนี้
        </h2>
        <Link href={`/plan?day=${dayNumber}`} className="inline-flex min-h-11 items-center px-2 text-[14px] font-semibold text-primary">
          ดูทั้งหมด
        </Link>
      </div>
      <ol className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {stops.map((s, i) => {
          const time = i === 0 ? s.planned_departure_at : s.planned_arrival_at;
          return (
            <li key={s.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
              <span className="w-12 shrink-0 text-[15px] font-semibold tabular-nums">
                {time ? formatTime(time, timeZone).replace(" น.", "") : "—"}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[15px] ${s.status === "skipped" ? "text-ink-3 line-through" : ""}`}>
                {s.name}
              </span>
              {i === 0 ? <span className="text-[12px] text-ink-2">ออกเดินทาง</span> : <StatusChip status={s.status} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
