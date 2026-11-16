import Link from "next/link";
import { StopTypeIcon } from "@/components/plan/stop-visuals";
import { Stamp } from "@/components/ui/Stamp";
import { formatTime } from "@/lib/time";
import type { StopRow } from "@/services/data/types";

/**
 * The day as journal notes (SPEC §10.3 item 7, design doc §6.7): a dashed line
 * with type icons as pins; finished places get a red strike and a time stamp.
 * Every status is also written in words. May sit below the fold.
 */
export function TodayList({ stops, dayNumber, timeZone }: { stops: StopRow[]; dayNumber: number; timeZone: string }) {
  if (stops.length === 0) return null;
  const hm = (ms: string | null) => (ms ? formatTime(ms, timeZone).replace(" น.", "") : "—");

  return (
    <section aria-labelledby="today-heading" className="mt-4">
      <div className="mb-1 flex items-baseline justify-between px-1">
        <h2 id="today-heading" className="font-hand text-[19px] font-bold">
          แผนของวันนี้
        </h2>
        <Link href={`/plan?day=${dayNumber}`} className="inline-flex min-h-11 items-center px-2 text-[14px] font-semibold text-primary">
          ดูทั้งหมด
        </Link>
      </div>
      <ol className="relative pl-11">
        <span aria-hidden className="absolute top-5 bottom-5 left-[19px] border-l-2 border-dashed border-line-strong" />
        {stops.map((s, i) => {
          const done = s.status === "completed";
          const skipped = s.status === "skipped";
          const planned = i === 0 ? s.planned_departure_at : s.planned_arrival_at;
          return (
            <li key={s.id} className="relative flex min-h-[54px] items-center gap-2 py-1">
              <span className="absolute -left-11 grid w-10 place-items-center">
                <span className={`rounded-xl bg-canvas ${done || skipped ? "opacity-60" : ""}`}>
                  <StopTypeIcon type={s.stop_type} size={32} />
                </span>
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-[15px] ${
                  done
                    ? "text-ink-2 line-through decoration-ink-red/70 decoration-2"
                    : skipped
                      ? "text-ink-3 line-through"
                      : s.status === "in_progress"
                        ? "font-bold"
                        : ""
                }`}
              >
                {s.name}
              </span>
              {done ? (
                <Stamp size="sm" tone="red" rotate={-14} className="-my-1.5">
                  {i === 0 ? "ออก" : "เสร็จ"} <br />
                  {hm(s.completed_at ?? s.started_at)}
                </Stamp>
              ) : skipped ? (
                <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[12px] font-semibold text-ink-2">ข้าม</span>
              ) : s.status === "in_progress" ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[12px] font-bold text-primary">อยู่ที่นี่</span>
              ) : (
                <span className="shrink-0 text-right text-[15px] font-semibold text-ink-2 tabular-nums">
                  {i === 0 && <span className="mr-1.5 text-[12px] font-normal">ออกเดินทาง</span>}
                  {hm(planned)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
