"use client";

import { HandIcon, type HandIconName } from "@/components/ui/icons";
import { formatMinutes } from "@/lib/schedule/format";
import type { RecalcResult } from "@/lib/schedule/recalculate";
import { formatTime } from "@/lib/time";
import type { StopRow } from "@/services/data/types";
import { StatusChip, StatusPin, StopTypeIcon } from "./stop-visuals";

interface TimelineProps {
  stops: StopRow[];
  analysis: RecalcResult<StopRow>;
  timeZone: string;
  onOpen(stop: StopRow): void;
}

const GRID = "grid grid-cols-[52px_24px_minmax(0,1fr)] gap-x-2";

/**
 * Vertical timeline (SPEC §10.4) as a journal page: times in the margin, a
 * dashed ink line with status pins, and each place as a slip of paper.
 */
export function Timeline({ stops, analysis, timeZone, onOpen }: TimelineProps) {
  const gaps = new Map(analysis.gaps.map((g) => [g.stopId, g.minutes]));
  const conflicts = new Map(analysis.conflicts.map((c) => [c.stopId, c.lateMinutes]));
  const t = (iso: string | null) => (iso ? formatTime(iso, timeZone).replace(" น.", "") : "—");

  return (
    <ol className="mt-5">
      {stops.map((stop, i) => {
        const isOrigin = i === 0;
        const isLast = i === stops.length - 1;
        const skipped = stop.status === "skipped";
        const here = stop.status === "in_progress";
        return (
          <li key={stop.id}>
            {!isOrigin && <DriveRow stop={stop} gap={gaps.get(stop.id) ?? null} conflict={conflicts.get(stop.id) ?? null} />}
            <div className={GRID}>
              {/* times in the margin */}
              <div className="pt-3.5 text-right tabular-nums">
                {isOrigin ? (
                  <span className="block text-[15px] font-bold">{t(stop.planned_departure_at)}</span>
                ) : (
                  <>
                    <span className={`block text-[15px] font-bold ${skipped ? "text-ink-3" : ""}`}>{t(stop.planned_arrival_at)}</span>
                    {stop.duration_minutes > 0 && <span className="block text-[12px] text-ink-2">{t(stop.planned_departure_at)}</span>}
                  </>
                )}
              </div>
              {/* dashed line + pin */}
              <div aria-hidden className="relative flex justify-center">
                <span
                  className={`absolute border-l-2 border-dashed border-line-strong ${isOrigin ? "top-5" : "top-0"} ${isLast ? "h-5" : "bottom-0"}`}
                />
                <span className="relative mt-4 flex">
                  <StatusPin status={stop.status} />
                </span>
              </div>
              {/* the place, as a slip of paper */}
              <button
                type="button"
                onClick={() => onOpen(stop)}
                className={`relative my-1.5 flex min-h-14 w-full items-start gap-3 rounded-[6px] bg-card p-3 text-left shadow-[0_3px_10px_rgb(60_40_10/0.12)] active:bg-card-sunken ${
                  here ? "outline-2 outline-primary" : ""
                } ${skipped ? "opacity-60" : ""}`}
              >
                {here && (
                  <span
                    aria-hidden
                    className="absolute -top-2 right-6 h-4 w-12 rotate-3 bg-[rgb(222_184_110/0.65)] [clip-path:polygon(4%_0,96%_6%,100%_50%,95%_100%,3%_94%,0_45%)]"
                  />
                )}
                <StopTypeIcon type={stop.stop_type} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className={`min-w-0 flex-1 text-[16px] leading-snug font-semibold break-words ${skipped ? "line-through" : ""}`}>
                      {stop.name}
                    </span>
                    {stop.is_fixed && <HandIcon name="lock" size={16} aria-label="ล็อกเวลาถึง" className="mt-0.5 text-ink-2" />}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                    {isOrigin ? (
                      <span>ออกเดินทาง {stop.planned_departure_at ? formatTime(stop.planned_departure_at, timeZone) : "—"}</span>
                    ) : (
                      <>
                        <StatusChip status={stop.status} />
                        {stop.duration_minutes > 0 && <span>อยู่ {formatMinutes(stop.duration_minutes)}</span>}
                      </>
                    )}
                  </span>
                  {stop.note && (
                    <span className="mt-1.5 flex items-center gap-1 font-hand text-[14px] text-ink-2">
                      <HandIcon name="notebook" size={15} />
                      <span className="truncate">{stop.note.split("\n")[0]}</span>
                    </span>
                  )}
                </span>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Between two places: drive time, review/missing badges, free time and conflicts. */
function DriveRow({ stop, gap, conflict }: { stop: StopRow; gap: number | null; conflict: number | null }) {
  const badges: { text: string; tone: "warning" | "neutral"; icon: HandIconName }[] = [];
  if (stop.travel_minutes === null) badges.push({ text: "ยังไม่กรอกเวลาขับ", tone: "warning", icon: "warning" });
  else if (stop.travel_needs_review) badges.push({ text: "ตรวจเวลาขับ", tone: "warning", icon: "warning" });
  if (gap) badges.push({ text: `ว่าง ${formatMinutes(gap)}`, tone: "neutral", icon: "clock" });
  if (conflict) badges.push({ text: `จะถึงช้ากว่าเวลาที่ล็อก ${formatMinutes(conflict)}`, tone: "warning", icon: "warning" });

  return (
    <div className={GRID}>
      <span />
      <span aria-hidden className="flex justify-center">
        <span className="border-l-2 border-dashed border-line-strong" />
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-[13px] text-ink-2">
        {stop.travel_minutes !== null && (
          <span className="inline-flex items-center gap-1 font-hand text-[14px]">
            <HandIcon name="car" size={17} />~{formatMinutes(stop.travel_minutes)}
          </span>
        )}
        {badges.map((b) => (
          <span
            key={b.text}
            className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 font-semibold ${
              b.tone === "warning" ? "rotate-[-0.5deg] bg-warning-soft text-warning-ink" : "bg-card-sunken text-ink-2"
            }`}
          >
            <HandIcon name={b.icon} size={14} />
            {b.text}
          </span>
        ))}
      </div>
    </div>
  );
}
