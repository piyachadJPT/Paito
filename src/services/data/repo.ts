import { tripRowsToFile } from "@/lib/import/export";
import { tripFileToRows, type TripFile } from "@/lib/import/import-schema";
import { DEFAULT_TIMEZONE, eachDateKey, zonedLocalToUtc } from "@/lib/time";
import type { PaitoDB } from "./db";
import { applyChanges, getMeta, setMeta, type ApplyDeps } from "./local";
import type { DayRow, StopRow, TripRow } from "./types";

export const MAX_TRIP_DAYS = 60;
export const DEFAULT_ORIGIN_NAME = "จุดออกเดินทาง";
export const DEFAULT_ORIGIN_DEPARTURE = "08:00";

export interface RepoDeps extends ApplyDeps {
  db: PaitoDB;
  /** Signed-in user's id (rows carry user_id for RLS) */
  userId: string;
}

export interface NewTripInput {
  name: string;
  start_date: string;
  end_date: string;
  timezone?: string;
}

/** Create a trip with one day per date, each with an origin (D6). */
export async function createTrip(deps: RepoDeps, input: NewTripInput): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("ต้องมีชื่อทริป");
  if (input.end_date < input.start_date) throw new Error("วันจบต้องไม่ก่อนวันเริ่ม");
  const dates = eachDateKey(input.start_date, input.end_date);
  if (dates.length > MAX_TRIP_DAYS) throw new Error(`ทริปยาวได้ไม่เกิน ${MAX_TRIP_DAYS} วัน`);

  const tz = input.timezone ?? DEFAULT_TIMEZONE;
  const now = deps.nowIso();
  const stamp = { user_id: deps.userId, created_at: now, updated_at: now };

  const trip: TripRow = {
    id: deps.newId(),
    name,
    start_date: input.start_date,
    end_date: input.end_date,
    timezone: tz,
    day_cutoff_hour: 4,
    departure_alert_minutes: 15,
    note: null,
    ...stamp,
  };
  const days: DayRow[] = dates.map((date, i) => ({
    id: deps.newId(),
    trip_id: trip.id,
    day_number: i + 1,
    date,
    title: null,
    ...stamp,
  }));
  const origins: StopRow[] = days.map((day) => newOrigin(deps, trip, day, stamp));

  await applyChanges(
    deps.db,
    [
      { table: "trips", op: "upsert", rows: [trip] },
      { table: "trip_days", op: "upsert", rows: days },
      { table: "trip_stops", op: "upsert", rows: origins },
    ],
    deps,
  );
  await setMeta(deps.db, "activeTripId", trip.id);
  return trip.id;
}

function newOrigin(
  deps: RepoDeps,
  trip: TripRow,
  day: DayRow,
  stamp: { user_id: string; created_at: string; updated_at: string },
): StopRow {
  return {
    id: deps.newId(),
    trip_id: trip.id,
    trip_day_id: day.id,
    sort_order: 0,
    name: DEFAULT_ORIGIN_NAME,
    stop_type: "lodging",
    maps_query: null,
    maps_url: null,
    latitude: null,
    longitude: null,
    travel_minutes: null,
    travel_needs_review: false,
    duration_minutes: 0,
    is_fixed: false,
    planned_arrival_at: null,
    planned_departure_at: zonedLocalToUtc(`${day.date}T${DEFAULT_ORIGIN_DEPARTURE}`, trip.timezone).toISOString(),
    status: "not_started",
    started_at: null,
    completed_at: null,
    note: null,
    ...stamp,
  };
}

/** Import a validated trip file as a new trip and make it active. */
export async function importTrip(deps: RepoDeps, file: TripFile): Promise<string> {
  const rows = tripFileToRows(file, { newId: deps.newId, now: deps.nowIso() });
  const withUser = <T extends object>(r: T) => ({ ...r, user_id: deps.userId });

  await applyChanges(
    deps.db,
    [
      { table: "trips", op: "upsert", rows: [withUser(rows.trip)] },
      { table: "trip_days", op: "upsert", rows: rows.days.map(withUser) },
      { table: "trip_stops", op: "upsert", rows: rows.stops.map(withUser) },
    ],
    deps,
  );
  await setMeta(deps.db, "activeTripId", rows.trip.id);
  return rows.trip.id;
}

export type TripPatch = Partial<Pick<TripRow, "name" | "note" | "departure_alert_minutes">>;

export async function updateTrip(deps: RepoDeps, tripId: string, patch: TripPatch): Promise<void> {
  const current = await deps.db.trips.get(tripId);
  if (!current) throw new Error("ไม่พบทริป");
  const next: TripRow = { ...current, ...patch, updated_at: deps.nowIso() };
  await applyChanges(deps.db, [{ table: "trips", op: "upsert", rows: [next] }], deps);
}

export async function setActiveTrip(db: PaitoDB, tripId: string): Promise<void> {
  await setMeta(db, "activeTripId", tripId);
}

export async function getActiveTripId(db: PaitoDB): Promise<string | undefined> {
  return getMeta<string>(db, "activeTripId");
}

/** Backup / share file for one trip. */
export async function exportTrip(db: PaitoDB, tripId: string): Promise<TripFile> {
  const trip = await db.trips.get(tripId);
  if (!trip) throw new Error("ไม่พบทริป");
  const [days, stops] = await Promise.all([
    db.trip_days.where("trip_id").equals(tripId).toArray(),
    db.trip_stops.where("trip_id").equals(tripId).toArray(),
  ]);
  return tripRowsToFile(trip, days, stops);
}
