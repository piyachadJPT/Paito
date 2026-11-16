import { MINUTE, type ScheduleStop } from "./types";

/** ISO string (any offset) → epoch ms; null stays null. */
export function toMs(iso: string | null | undefined): number | null {
  if (iso == null) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid timestamp: ${iso}`);
  return ms;
}

/** epoch ms → canonical ISO string (UTC, "Z"). */
export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Round up to the next 5-minute boundary (aligned for every real timezone). */
export function ceilTo5Minutes(ms: number): number {
  const step = 5 * MINUTE;
  return Math.ceil(ms / step) * step;
}

/** Order within a day: (sort_order, created_at). */
export function compareStops(a: ScheduleStop, b: ScheduleStop): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Stops of one day in display order (the first one is the origin). */
export function getDayStops<T extends ScheduleStop>(stops: readonly T[], dayId: string): T[] {
  return stops.filter((s) => s.trip_day_id === dayId).sort(compareStops);
}

/** Calendar-day difference b − a for "YYYY-MM-DD" keys. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
