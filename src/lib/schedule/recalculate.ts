import { MINUTE, type ScheduleStop } from "./types";
import { toIso, toMs } from "./util";

export interface TimeConflict {
  stopId: string;
  /** How late we would arrive at the fixed stop */
  lateMinutes: number;
}

export interface TimeGap {
  stopId: string;
  /** Free time before the fixed stop */
  minutes: number;
}

export interface RecalcResult<T extends ScheduleStop> {
  /** The whole day, with updated planned times */
  stops: T[];
  /** Only the rows whose planned times changed (save these as one batch) */
  changed: T[];
  conflicts: TimeConflict[];
  gaps: TimeGap[];
  /** Stops whose travel_minutes is missing ("ยังไม่กรอกเวลาขับ") */
  missingTravel: string[];
}

const LOCKED: ReadonlySet<ScheduleStop["status"]> = new Set(["completed", "in_progress", "skipped"]);

/**
 * Recompute planned times of one day (SPEC §5.2), for every stop after
 * `fromIndex`. Times flow from the plan only; actual times never move it.
 *
 * `stops` must be the day's stops in order (index 0 = origin).
 */
export function recalculateDay<T extends ScheduleStop>(stops: readonly T[], fromIndex: number): RecalcResult<T> {
  const out = stops.map((s) => ({ ...s }));
  const changed = new Set<number>();
  const conflicts: TimeConflict[] = [];
  const gaps: TimeGap[] = [];
  const missingTravel: string[] = [];

  for (let i = Math.max(fromIndex, 0) + 1; i < out.length; i++) {
    const stop = out[i];
    if (LOCKED.has(stop.status)) continue;

    const prev = findPrevious(out, i);
    const prevDeparture = prev ? toMs(prev.planned_departure_at) : null;
    if (prevDeparture === null) continue; // nothing to chain from

    if (stop.travel_minutes === null) missingTravel.push(stop.id);
    const computedArrival = prevDeparture + (stop.travel_minutes ?? 0) * MINUTE;

    let arrival = computedArrival;
    const fixedArrival = stop.is_fixed ? toMs(stop.planned_arrival_at) : null;
    if (fixedArrival !== null) {
      arrival = fixedArrival;
      const diff = Math.round((computedArrival - fixedArrival) / MINUTE);
      if (diff > 0) conflicts.push({ stopId: stop.id, lateMinutes: diff });
      if (diff < 0) gaps.push({ stopId: stop.id, minutes: -diff });
    }
    const departure = arrival + stop.duration_minutes * MINUTE;

    const nextArrival = toIso(arrival);
    const nextDeparture = toIso(departure);
    if (!sameInstant(stop.planned_arrival_at, nextArrival) || !sameInstant(stop.planned_departure_at, nextDeparture)) {
      stop.planned_arrival_at = nextArrival;
      stop.planned_departure_at = nextDeparture;
      changed.add(i);
    }
  }

  return {
    stops: out,
    changed: out.filter((_, i) => changed.has(i)),
    conflicts,
    gaps,
    missingTravel,
  };
}

/** Recalculate the whole day — use for display (gaps, conflicts, missing travel). */
export function analyzeDay<T extends ScheduleStop>(stops: readonly T[]): RecalcResult<T> {
  return recalculateDay(stops, 0);
}

function findPrevious<T extends ScheduleStop>(stops: readonly T[], index: number): T | null {
  for (let j = index - 1; j >= 0; j--) {
    if (stops[j].status !== "skipped") return stops[j];
  }
  return null;
}

function sameInstant(a: string | null, b: string): boolean {
  return a !== null && toMs(a) === toMs(b);
}
