import type { Progress } from "@/lib/schedule/progress";
import type { StopRow } from "@/services/data/types";

/**
 * The day as a dashed road with a pin per place (U6), plus the text
 * "เที่ยวแล้ว 2 จาก 5 ที่" (SPEC §10.3 item 5 — text, not color alone).
 */
export function RouteDots({ stops, progress }: { stops: StopRow[]; progress: Progress }) {
  const places = stops.slice(1).filter((s) => s.stop_type === "sight" || s.stop_type === "food");
  if (places.length === 0) return null;

  return (
    <div>
      <div aria-hidden className="relative flex items-center justify-between px-1 py-2">
        <span className="absolute inset-x-2 top-1/2 border-t-2 border-dashed border-line-strong" />
        {places.map((s) => (
          <span
            key={s.id}
            className={`relative size-3.5 rounded-full ${
              s.status === "completed"
                ? "bg-success"
                : s.status === "in_progress"
                  ? "bg-primary ring-4 ring-primary-soft"
                  : s.status === "skipped"
                    ? "border-2 border-dashed border-ink-3 bg-card"
                    : "border-2 border-ink-3 bg-card"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-[14px] text-ink-2 tabular-nums">
        เที่ยวแล้ว <span className="font-semibold text-ink">{progress.done}</span> จาก {progress.total} ที่
        {progress.skipped > 0 && ` · ข้าม ${progress.skipped}`}
      </p>
    </div>
  );
}
