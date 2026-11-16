import { recalculateDay, type TimeConflict } from "./recalculate";
import { MINUTE, type ScheduleStop } from "./types";
import { ceilTo5Minutes, toIso, toMs } from "./util";

export interface ShiftOptions {
  /**
   * Also add the delay to `duration_minutes` (the +15 / +30 / custom buttons
   * while at a stop — SPEC §5.3).
   */
  extendDuration?: boolean;
}

export interface ShiftPreview {
  /** Last stop of the day, e.g. "ถึง {name} 19:40 น. (เดิม 19:05 น.)" */
  lastStop: { id: string; name: string; arrivalAt: number | null; previousArrivalAt: number | null } | null;
  /** "จะถึง {name} ช้ากว่าเวลาที่ล็อกไว้ 25 นาที" */
  conflicts: (TimeConflict & { name: string })[];
  /** How far the anchor's departure moved, in minutes */
  shiftMinutes: number;
}

export interface ShiftResult<T extends ScheduleStop> {
  stops: T[];
  /** Rows to save as one batch (anchor first) */
  changed: T[];
  /** The same rows before the change — restore these to undo */
  snapshot: T[];
  preview: ShiftPreview;
}

/**
 * Move the plan from `anchorStopId` onwards (SPEC §5.3). Same day only;
 * fixed stops never move. Nothing is saved: show `preview`, then persist
 * `changed`, keeping `snapshot` for undo.
 */
export function shiftFrom<T extends ScheduleStop>(
  dayStops: readonly T[],
  anchorStopId: string,
  newDeparture: number,
  options: ShiftOptions = {},
): ShiftResult<T> {
  const anchorIndex = dayStops.findIndex((s) => s.id === anchorStopId);
  if (anchorIndex < 0) throw new Error(`Stop ${anchorStopId} is not in this day`);

  const anchor = dayStops[anchorIndex];
  const oldDeparture = toMs(anchor.planned_departure_at);
  const departure = ceilTo5Minutes(newDeparture);
  const deltaMinutes = oldDeparture === null ? 0 : Math.round((departure - oldDeparture) / MINUTE);

  const moved: T = {
    ...anchor,
    planned_departure_at: toIso(departure),
    duration_minutes:
      options.extendDuration && deltaMinutes > 0 ? anchor.duration_minutes + deltaMinutes : anchor.duration_minutes,
  };
  const withAnchor = dayStops.map((s, i) => (i === anchorIndex ? moved : s));
  const recalc = recalculateDay(withAnchor, anchorIndex);

  const anchorChanged = departure !== oldDeparture || moved.duration_minutes !== anchor.duration_minutes;
  const changed = anchorChanged ? [recalc.stops[anchorIndex], ...recalc.changed] : recalc.changed;
  const changedIds = new Set(changed.map((s) => s.id));

  const last = dayStops.length > 1 ? dayStops[dayStops.length - 1] : null;
  const lastAfter = last ? recalc.stops[dayStops.length - 1] : null;
  const names = new Map(dayStops.map((s) => [s.id, s.name]));

  return {
    stops: recalc.stops,
    changed,
    snapshot: dayStops.filter((s) => changedIds.has(s.id)).map((s) => ({ ...s })),
    preview: {
      lastStop:
        last && lastAfter
          ? {
              id: last.id,
              name: last.name,
              arrivalAt: toMs(lastAfter.planned_arrival_at),
              previousArrivalAt: toMs(last.planned_arrival_at),
            }
          : null,
      conflicts: recalc.conflicts.map((c) => ({ ...c, name: names.get(c.stopId) ?? "" })),
      shiftMinutes: deltaMinutes,
    },
  };
}

/** At a stop and overstaying: leave at max(started_at + duration, now). */
export function overstayDeparture(current: ScheduleStop, now: number): number {
  const started = toMs(current.started_at) ?? now;
  return Math.max(started + current.duration_minutes * MINUTE, now);
}

/** In transit but late: re-anchor on the stop we left, at completed_at ?? now. */
export function transitDeparture(from: ScheduleStop, now: number): number {
  return toMs(from.completed_at) ?? now;
}

/** +N minutes from the planned departure (before leaving the origin, or +15/+30 at a stop). */
export function delayedDeparture(stop: ScheduleStop, minutes: number, now: number): number {
  return (toMs(stop.planned_departure_at) ?? now) + minutes * MINUTE;
}
