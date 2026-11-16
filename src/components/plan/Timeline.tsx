"use client";

import { AlertTriangle, Car, Hourglass, Lock, StickyNote } from "lucide-react";
import { formatMinutes } from "@/lib/schedule/format";
import type { RecalcResult } from "@/lib/schedule/recalculate";
import { formatTime } from "@/lib/time";
import type { StopRow } from "@/services/data/types";
import { StatusChip, StopTypeIcon, statusDotClass } from "./stop-visuals";

interface TimelineProps {
  stops: StopRow[];
  analysis: RecalcResult<StopRow>;
  timeZone: string;
  onOpen(stop: StopRow): void;
}

/** Vertical timeline (SPEC §10.4): times · line with status dots · cards, with drive rows between. */
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
        return (
          <li key={stop.id}>
            {!isOrigin && (
              <DriveRow stop={stop} gap={gaps.get(stop.id) ?? null} conflict={conflicts.get(stop.id) ?? null} />
            )}
            <div className="grid grid-cols-[52px_20px_minmax(0,1fr)] gap-x-2">
              {/* times */}
              <div className="pt-3 text-right tabular-nums">
                {isOrigin ? (
                  <span className="block text-[15px] font-bold">{t(stop.planned_departure_at)}</span>
                ) : (
                  <>
                    <span className={`block text-[15px] font-bold ${skipped ? "text-ink-3" : ""}`}>{t(stop.planned_arrival_at)}</span>
                    {stop.duration_minutes > 0 && (
                      <span className="block text-[12px] text-ink-2">{t(stop.planned_departure_at)}</span>
                    )}
                  </>
                )}
              </div>
              {/* line + dot */}
              <div aria-hidden className="relative flex justify-center">
                <span className={`absolute top-0 bottom-0 w-0.5 bg-line-strong ${isOrigin ? "top-5" : ""} ${isLast ? "bottom-auto h-5" : ""}`} />
                <span className={`relative mt-[18px] size-3 rounded-full ${statusDotClass(stop.status)}`} />
              </div>
              {/* card */}
              <button
                type="button"
                onClick={() => onOpen(stop)}
                className={`my-1 flex min-h-14 w-full items-start gap-3 rounded-[var(--radius-card)] border bg-card p-3 text-left active:bg-card-sunken ${
                  stop.status === "in_progress" ? "border-primary ring-2 ring-primary/25" : "border-line"
                } ${skipped ? "opacity-60" : ""}`}
              >
                <StopTypeIcon type={stop.stop_type} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className={`min-w-0 flex-1 text-[16px] leading-snug font-semibold ${skipped ? "line-through" : ""}`}>
                      {stop.name}
                    </span>
                    {stop.is_fixed && <Lock aria-label="ล็อกเวลาถึง" size={15} className="mt-1 shrink-0 text-ink-2" />}
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
                    <span className="mt-1 flex items-center gap-1 text-[13px] text-ink-2">
                      <StickyNote aria-hidden size={13} className="shrink-0" />
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

/** Between two cards: drive time, review/missing badges, free time and conflicts. */
function DriveRow({ stop, gap, conflict }: { stop: StopRow; gap: number | null; conflict: number | null }) {
  const badges: { text: string; tone: "warning" | "neutral"; icon: typeof Car }[] = [];
  if (stop.travel_minutes === null) badges.push({ text: "ยังไม่กรอกเวลาขับ", tone: "warning", icon: AlertTriangle });
  else if (stop.travel_needs_review) badges.push({ text: "ตรวจเวลาขับ", tone: "warning", icon: AlertTriangle });
  if (gap) badges.push({ text: `ว่าง ${formatMinutes(gap)}`, tone: "neutral", icon: Hourglass });
  if (conflict) badges.push({ text: `จะถึงช้ากว่าเวลาที่ล็อก ${formatMinutes(conflict)}`, tone: "warning", icon: AlertTriangle });

  return (
    <div className="grid grid-cols-[52px_20px_minmax(0,1fr)] gap-x-2">
      <span />
      <span aria-hidden className="flex justify-center">
        <span className="w-0.5 bg-line-strong" />
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-[13px] text-ink-2">
        {stop.travel_minutes !== null && (
          <span className="inline-flex items-center gap-1">
            <Car aria-hidden size={15} />~{formatMinutes(stop.travel_minutes)}
          </span>
        )}
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <span
              key={b.text}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                b.tone === "warning" ? "bg-warning-soft text-warning-ink" : "bg-card-sunken text-ink-2"
              }`}
            >
              <Icon aria-hidden size={13} />
              {b.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
