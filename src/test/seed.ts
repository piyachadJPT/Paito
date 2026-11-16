/** Test fixtures built from docs/seed-trip.json (never edited for tests). */
import seedJson from "../../docs/seed-trip.json";
import { parseTripFile, tripFileToRows, type ImportedStop } from "@/lib/import/import-schema";
import type { ScheduleStop } from "@/lib/schedule/types";
import { getDayStops } from "@/lib/schedule/util";
import { zonedLocalToUtc } from "@/lib/time";

export const BKK = "Asia/Bangkok";
export const rawSeed = seedJson;

/** Trip-local wall time → epoch ms */
export const at = (local: string) => zonedLocalToUtc(local, BKK).getTime();
/** Trip-local wall time → ISO */
export const iso = (local: string) => zonedLocalToUtc(local, BKK).toISOString();

export function loadSeed() {
  const parsed = parseTripFile(seedJson);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  let n = 0;
  const rows = tripFileToRows(parsed.file, { newId: () => `id-${++n}`, now: "2026-11-16T00:00:00.000Z" });
  const dayId = (dayNumber: number) => rows.days.find((d) => d.day_number === dayNumber)!.id;
  return {
    ...rows,
    dayId,
    dayStops: (dayNumber: number, stops: readonly ImportedStop[] = rows.stops) => getDayStops(stops, dayId(dayNumber)),
    stopByName: (dayNumber: number, name: string, stops: readonly ImportedStop[] = rows.stops) =>
      getDayStops(stops, dayId(dayNumber)).find((s) => s.name === name)!,
  };
}

/** Replace rows by id. */
export function withUpdates<T extends ScheduleStop>(stops: readonly T[], updates: readonly T[]): T[] {
  const byId = new Map(updates.map((u) => [u.id, u]));
  return stops.map((s) => byId.get(s.id) ?? s);
}

let counter = 0;
/** Minimal synthetic stop. */
export function makeStop(partial: Partial<ScheduleStop> = {}): ScheduleStop {
  counter++;
  return {
    id: `s${counter}`,
    trip_id: "t",
    trip_day_id: "d",
    sort_order: counter * 1000,
    created_at: "2026-01-01T00:00:00.000Z",
    name: `Stop ${counter}`,
    stop_type: "sight",
    travel_minutes: 10,
    travel_needs_review: false,
    duration_minutes: 30,
    is_fixed: false,
    planned_arrival_at: null,
    planned_departure_at: null,
    status: "not_started",
    started_at: null,
    completed_at: null,
    ...partial,
  };
}
