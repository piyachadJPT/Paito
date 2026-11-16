/**
 * Plan edits (SPEC §10.4): edit, add, delete, reorder and move a stop to
 * another day. Each returns the rows to save, ids to delete and the exact
 * inverse for "ย้อนกลับ". Pure; nothing is saved here.
 *
 * Every edit re-runs recalculateDay on the affected day(s), and flags
 * travel_needs_review on stops whose previous stop changed.
 */
import { recalculateDay, type TimeConflict, type TimeGap } from "./recalculate";
import { MINUTE, type ScheduleStop } from "./types";
import { compareStops, toIso, toMs } from "./util";

export interface PlanChange<T extends ScheduleStop> {
  upserts: T[];
  deletes: string[];
  undo: { upserts: T[]; deletes: string[] };
  /** For the toast / labels of the edited day */
  conflicts: TimeConflict[];
  gaps: TimeGap[];
}

const SORT_STEP = 1000;

/** Edit fields of one stop (not its position). */
export function editStop<T extends ScheduleStop>(dayStops: readonly T[], updated: T): PlanChange<T> {
  const index = indexOf(dayStops, updated.id);
  const original = dayStops[index];
  const next = { ...updated };
  if (index === 0) {
    // D7: the origin has no travel / duration / status
    Object.assign(next, { travel_minutes: null, duration_minutes: 0, is_fixed: false, planned_arrival_at: null });
  }
  if (next.travel_minutes !== original.travel_minutes) next.travel_needs_review = false;
  if (!next.is_fixed && original.is_fixed) next.planned_arrival_at = original.planned_arrival_at; // recalculated below
  // recalculateDay never touches started stops, so a new duration must move their departure here
  if (index > 0 && next.status !== "not_started" && next.duration_minutes !== original.duration_minutes) {
    const arrival = toMs(next.planned_arrival_at);
    if (arrival !== null) next.planned_departure_at = toIso(arrival + next.duration_minutes * MINUTE);
  }

  const after = dayStops.map((s, i) => (i === index ? next : s));
  return finish(dayStops, [relayout(after)]);
}

/** Where "+ เพิ่มสถานที่" goes: before tonight's lodging, else at the end. */
export function defaultInsertIndex(dayStops: readonly ScheduleStop[]): number {
  const last = dayStops[dayStops.length - 1];
  return dayStops.length >= 2 && last.stop_type === "lodging" ? dayStops.length - 1 : dayStops.length;
}

/** Insert a new stop at `index` (≥ 1; default: before the last lodging). sort_order is assigned. */
export function insertStop<T extends ScheduleStop>(dayStops: readonly T[], stop: T, index = defaultInsertIndex(dayStops)): PlanChange<T> {
  const at = Math.min(Math.max(index, 1), dayStops.length);
  const placed = { ...stop, sort_order: sortOrderBetween(dayStops[at - 1], dayStops[at]) };
  const after = [...dayStops.slice(0, at), placed, ...dayStops.slice(at)];
  return finish(dayStops, [relayout(flagMovedNeighbours(dayStops, after))]);
}

/** Delete a stop (never the origin). */
export function removeStop<T extends ScheduleStop>(dayStops: readonly T[], stopId: string): PlanChange<T> {
  const index = indexOf(dayStops, stopId);
  if (index === 0) throw new Error("The origin cannot be deleted");
  const after = dayStops.filter((s) => s.id !== stopId);
  return finish(dayStops, [relayout(flagMovedNeighbours(dayStops, after))], [stopId]);
}

export function canMove(dayStops: readonly ScheduleStop[], stopId: string, direction: -1 | 1): boolean {
  const index = dayStops.findIndex((s) => s.id === stopId);
  const target = index + direction;
  return index >= 1 && target >= 1 && target < dayStops.length;
}

/** Move one place up (-1) or down (+1), never above the origin (D7). */
export function moveStop<T extends ScheduleStop>(dayStops: readonly T[], stopId: string, direction: -1 | 1): PlanChange<T> {
  if (!canMove(dayStops, stopId, direction)) throw new Error("Cannot move this stop there");
  const index = indexOf(dayStops, stopId);
  const target = index + direction;
  const a = dayStops[index];
  const b = dayStops[target];

  let after: T[];
  if (a.sort_order !== b.sort_order) {
    const swapped = dayStops.map((s) =>
      s.id === a.id ? { ...s, sort_order: b.sort_order } : s.id === b.id ? { ...s, sort_order: a.sort_order } : s,
    );
    after = [...swapped].sort(compareStops);
  } else {
    // Tied sort_order: renumber the day
    const order = [...dayStops];
    [order[index], order[target]] = [order[target], order[index]];
    after = order.map((s, i) => (s.sort_order === i * SORT_STEP ? s : { ...s, sort_order: i * SORT_STEP }));
  }
  return finish(dayStops, [relayout(flagMovedNeighbours(dayStops, after))]);
}

/** Move a stop to another day, before that day's last lodging (SPEC §10.4). Both days are recalculated. */
export function moveStopToDay<T extends ScheduleStop>(
  fromDay: readonly T[],
  toDay: readonly T[],
  stopId: string,
  targetDayId: string,
): PlanChange<T> {
  const index = indexOf(fromDay, stopId);
  if (index === 0) throw new Error("The origin cannot be moved");
  if (toDay.length === 0) throw new Error("The target day has no origin");
  const moving = fromDay[index];
  const fromAfter = fromDay.filter((s) => s.id !== stopId);

  const at = defaultInsertIndex(toDay);
  const placed = { ...moving, trip_day_id: targetDayId, sort_order: sortOrderBetween(toDay[at - 1], toDay[at]) };
  const toAfter = [...toDay.slice(0, at), placed, ...toDay.slice(at)];

  return finish(
    [...fromDay, ...toDay],
    [relayout(flagMovedNeighbours(fromDay, fromAfter)), relayout(flagMovedNeighbours(toDay, toAfter, true))],
  );
}

// ---------------------------------------------------------------------------

function indexOf(stops: readonly ScheduleStop[], id: string): number {
  const i = stops.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`Stop ${id} is not in this day`);
  return i;
}

function sortOrderBetween(prev: ScheduleStop | undefined, next: ScheduleStop | undefined): number {
  if (!prev) return next ? next.sort_order - SORT_STEP : 0;
  if (!next) return prev.sort_order + SORT_STEP;
  return (prev.sort_order + next.sort_order) / 2;
}

/**
 * Flag travel_needs_review where the previous stop changed. New stops are
 * not flagged ("ยังไม่กรอกเวลาขับ" says enough) unless `flagNew` (moved in).
 */
function flagMovedNeighbours<T extends ScheduleStop>(before: readonly T[], after: readonly T[], flagNew = false): T[] {
  const prevBefore = new Map<string, string | null>();
  before.forEach((s, i) => prevBefore.set(s.id, i === 0 ? null : before[i - 1].id));
  return after.map((s, i) => {
    if (i === 0 || s.travel_needs_review) return s;
    const was = prevBefore.get(s.id);
    if (was === undefined && !flagNew) return s;
    return was !== after[i - 1].id ? { ...s, travel_needs_review: true } : s;
  });
}

interface Relayout<T extends ScheduleStop> {
  stops: T[];
  conflicts: TimeConflict[];
  gaps: TimeGap[];
}

function relayout<T extends ScheduleStop>(day: T[]): Relayout<T> {
  const r = recalculateDay(day, 0);
  return { stops: r.stops, conflicts: r.conflicts, gaps: r.gaps };
}

function finish<T extends ScheduleStop>(before: readonly T[], days: Relayout<T>[], deletes: string[] = []): PlanChange<T> {
  const beforeById = new Map(before.map((s) => [s.id, s]));
  const after = days.flatMap((d) => d.stops);
  const upserts = after.filter((s) => {
    const was = beforeById.get(s.id);
    return !was || !sameRow(was, s);
  });
  const inserted = upserts.filter((s) => !beforeById.has(s.id)).map((s) => s.id);
  return {
    upserts,
    deletes,
    undo: {
      upserts: [
        ...upserts.filter((s) => beforeById.has(s.id)).map((s) => ({ ...beforeById.get(s.id)! })),
        ...deletes.map((id) => ({ ...beforeById.get(id)! })),
      ],
      deletes: inserted,
    },
    conflicts: days[0].conflicts,
    gaps: days[0].gaps,
  };
}

function sameRow(a: object, b: object): boolean {
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const k of keys) if (ra[k] !== rb[k]) return false;
  return true;
}
