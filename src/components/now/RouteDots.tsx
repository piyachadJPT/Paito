import { StatusPin } from "@/components/plan/stop-visuals";
import type { Progress } from "@/lib/schedule/progress";
import type { StopRow } from "@/services/data/types";

/**
 * The day as a hand-drawn dashed road with a pin per place (U6), plus the text
 * "เที่ยวแล้ว 2 จาก 5 ที่" (SPEC §10.3 item 5 — text, not colour alone).
 */
export function RouteDots({ stops, progress }: { stops: StopRow[]; progress: Progress }) {
  const places = stops.slice(1).filter((s) => s.stop_type === "sight" || s.stop_type === "food");
  if (places.length === 0) return null;

  return (
    <div>
      <div aria-hidden className="relative flex items-center justify-between px-1 py-2">
        <svg className="absolute inset-x-2 top-1/2 h-3 w-[calc(100%-16px)] -translate-y-1/2" viewBox="0 0 100 10" preserveAspectRatio="none">
          <path
            d="M0 5 Q12 2 25 5 T50 5 T75 5 T100 5"
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth="2"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {places.map((s) => (
          <StatusPin key={s.id} status={s.status} />
        ))}
      </div>
      <p className="mt-1 font-hand text-[15px] text-ink-2 tabular-nums">
        เที่ยวแล้ว <span className="font-bold text-ink">{progress.done}</span> จาก {progress.total} ที่
        {progress.skipped > 0 && ` · ข้าม ${progress.skipped}`}
      </p>
    </div>
  );
}
