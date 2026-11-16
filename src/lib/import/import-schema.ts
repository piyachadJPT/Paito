/**
 * Trip import file (SPEC §11, D10): validate with zod, then convert to rows
 * with computed planned times. Pure: ids and "now" are injected; nothing is saved.
 */
import { z } from "zod";
import { recalculateDay } from "@/lib/schedule/recalculate";
import type { ScheduleStop } from "@/lib/schedule/types";
import { zonedLocalToUtc } from "@/lib/time";

const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const localTime = z.string().regex(LOCAL_TIME, "ต้องเป็นเวลาแบบ YYYY-MM-DDTHH:MM");
const dateKey = z.string().regex(DATE, "ต้องเป็นวันที่แบบ YYYY-MM-DD");
const isoInstant = z.iso.datetime({ offset: true });
const minutes = z.number().int().min(0);

const stopSchema = z.object({
  name: z.string().trim().min(1, "ต้องมีชื่อ"),
  type: z.enum(["sight", "food", "rest", "lodging"]).default("sight"),
  maps_query: z.string().nullish(),
  maps_url: z.string().url().nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  depart_at: localTime.optional(),
  travel_minutes: minutes.nullish(),
  duration_minutes: minutes.default(0),
  fixed_arrive_at: localTime.optional(),
  note: z.string().nullish(),
  // Backup extras (D10): planned times keep shifted plans of started stops
  planned_arrive_at: localTime.optional(),
  planned_depart_at: localTime.optional(),
  status: z.enum(["not_started", "in_progress", "completed", "skipped"]).optional(),
  started_at: isoInstant.nullish(),
  completed_at: isoInstant.nullish(),
  travel_needs_review: z.boolean().optional(),
});

const daySchema = z.object({
  day_number: z.number().int().min(1),
  date: dateKey,
  title: z.string().nullish(),
  stops: z.array(stopSchema).min(1, "แต่ละวันต้องมีจุดออกเดินทางอย่างน้อย 1 จุด"),
});

export const tripFileSchema = z
  .object({
    version: z.literal(1),
    trip: z.object({
      name: z.string().trim().min(1),
      start_date: dateKey,
      end_date: dateKey,
      timezone: z.string().default("Asia/Bangkok"),
      day_cutoff_hour: z.number().int().min(0).max(12).default(4),
      departure_alert_minutes: z.number().int().min(0).max(120).default(15),
      note: z.string().nullish(),
    }),
    days: z.array(daySchema).min(1),
  })
  .superRefine((file, ctx) => {
    const { trip, days } = file;
    if (trip.end_date < trip.start_date) {
      ctx.addIssue({ code: "custom", path: ["trip", "end_date"], message: "วันจบต้องไม่ก่อนวันเริ่ม" });
    }
    if (!isValidTimeZone(trip.timezone)) {
      ctx.addIssue({ code: "custom", path: ["trip", "timezone"], message: `ไม่รู้จัก timezone ${trip.timezone}` });
    }
    const numbers = new Set<number>();
    const dates = new Set<string>();
    days.forEach((day, d) => {
      if (numbers.has(day.day_number)) {
        ctx.addIssue({ code: "custom", path: ["days", d, "day_number"], message: "day_number ซ้ำ" });
      }
      if (dates.has(day.date)) ctx.addIssue({ code: "custom", path: ["days", d, "date"], message: "วันที่ซ้ำ" });
      numbers.add(day.day_number);
      dates.add(day.date);
      if (day.date < trip.start_date || day.date > trip.end_date) {
        ctx.addIssue({ code: "custom", path: ["days", d, "date"], message: "วันที่อยู่นอกช่วงทริป" });
      }
      day.stops.forEach((stop, s) => {
        const path = ["days", d, "stops", s];
        if (s === 0) {
          if (stop.type !== "lodging") {
            ctx.addIssue({ code: "custom", path: [...path, "type"], message: "จุดแรกของวันต้องเป็นที่พัก (lodging)" });
          }
          if (!stop.depart_at) {
            ctx.addIssue({ code: "custom", path: [...path, "depart_at"], message: "จุดแรกของวันต้องมี depart_at" });
          }
        } else if (stop.depart_at) {
          ctx.addIssue({ code: "custom", path: [...path, "depart_at"], message: "depart_at ใช้ได้เฉพาะจุดแรกของวัน" });
        }
        if ((stop.latitude == null) !== (stop.longitude == null)) {
          ctx.addIssue({ code: "custom", path, message: "ต้องมีทั้ง latitude และ longitude" });
        }
      });
    });
    const inProgress = days.flatMap((d) => d.stops).filter((s) => s.status === "in_progress").length;
    if (inProgress > 1) ctx.addIssue({ code: "custom", path: ["days"], message: "กำลังเที่ยวได้ทีละ 1 จุด" });
  });

export type TripFile = z.infer<typeof tripFileSchema>;

export interface ImportedTrip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  day_cutoff_hour: number;
  departure_alert_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportedDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportedStop extends ScheduleStop {
  maps_query: string | null;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  updated_at: string;
}

export interface ImportedTripRows {
  trip: ImportedTrip;
  days: ImportedDay[];
  stops: ImportedStop[];
}

export type ParseResult =
  | { ok: true; file: TripFile }
  | { ok: false; errors: string[] };

/** Validate unknown JSON. Fields starting with "_" are ignored (zod strips unknown keys). */
export function parseTripFile(json: unknown): ParseResult {
  const result = tripFileSchema.safeParse(json);
  if (result.success) return { ok: true, file: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)),
  };
}

export interface ConvertDeps {
  newId: () => string;
  /** ISO timestamp used for created_at / updated_at */
  now: string;
}

/** File → rows (sort_order = index × 1000) with planned times from recalculateDay. */
export function tripFileToRows(file: TripFile, deps: ConvertDeps): ImportedTripRows {
  const tz = file.trip.timezone;
  const toUtc = (local: string) => zonedLocalToUtc(local, tz).toISOString();
  const stamp = { created_at: deps.now, updated_at: deps.now };

  const trip: ImportedTrip = {
    id: deps.newId(),
    name: file.trip.name,
    start_date: file.trip.start_date,
    end_date: file.trip.end_date,
    timezone: tz,
    day_cutoff_hour: file.trip.day_cutoff_hour,
    departure_alert_minutes: file.trip.departure_alert_minutes,
    note: file.trip.note ?? null,
    ...stamp,
  };

  const days: ImportedDay[] = [];
  const stops: ImportedStop[] = [];

  for (const day of [...file.days].sort((a, b) => a.day_number - b.day_number)) {
    const dayRow: ImportedDay = {
      id: deps.newId(),
      trip_id: trip.id,
      day_number: day.day_number,
      date: day.date,
      title: day.title ?? null,
      ...stamp,
    };
    days.push(dayRow);

    const dayStops: ImportedStop[] = day.stops.map((s, i) => {
      const isOrigin = i === 0;
      const fixed = !isOrigin && Boolean(s.fixed_arrive_at);
      return {
        id: deps.newId(),
        trip_id: trip.id,
        trip_day_id: dayRow.id,
        sort_order: i * 1000,
        name: s.name,
        stop_type: s.type,
        maps_query: s.maps_query ?? null,
        maps_url: s.maps_url ?? null,
        latitude: s.latitude ?? null,
        longitude: s.longitude ?? null,
        travel_minutes: isOrigin ? null : (s.travel_minutes ?? null),
        travel_needs_review: s.travel_needs_review ?? false,
        duration_minutes: isOrigin ? 0 : s.duration_minutes,
        is_fixed: fixed,
        planned_arrival_at: fixed
          ? toUtc(s.fixed_arrive_at!)
          : !isOrigin && s.planned_arrive_at
            ? toUtc(s.planned_arrive_at)
            : null,
        planned_departure_at: isOrigin
          ? toUtc(s.depart_at!)
          : s.planned_depart_at
            ? toUtc(s.planned_depart_at)
            : null,
        status: isOrigin ? "not_started" : (s.status ?? "not_started"),
        started_at: s.started_at ? new Date(s.started_at).toISOString() : null,
        completed_at: s.completed_at ? new Date(s.completed_at).toISOString() : null,
        note: s.note ?? null,
        ...stamp,
      };
    });

    stops.push(...recalculateDay(dayStops, 0).stops);
  }

  return { trip, days, stops };
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
