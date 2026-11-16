/**
 * Rows → trip file (SPEC §10.5 export, D10). Same format as import, so an
 * export is also a backup: status, actual times, coordinates and the
 * (possibly shifted) planned times are kept.
 */
import type { ScheduleStop } from "@/lib/schedule/types";
import { compareStops } from "@/lib/schedule/util";
import { getZonedParts } from "@/lib/time";
import type { TripFile } from "./import-schema";

export interface ExportTrip {
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  day_cutoff_hour: number;
  departure_alert_minutes: number;
  note: string | null;
}

export interface ExportDay {
  id: string;
  day_number: number;
  date: string;
  title: string | null;
}

export interface ExportStop extends ScheduleStop {
  maps_query: string | null;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
}

type FileStop = TripFile["days"][number]["stops"][number];

/** Instant → trip-local "YYYY-MM-DDTHH:MM" */
export function toLocalTime(iso: string, timeZone: string): string {
  const p = getZonedParts(iso, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function tripRowsToFile(trip: ExportTrip, days: readonly ExportDay[], stops: readonly ExportStop[]): TripFile {
  const tz = trip.timezone;
  const local = (iso: string | null) => (iso ? toLocalTime(iso, tz) : undefined);

  return {
    version: 1,
    trip: {
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      timezone: tz,
      day_cutoff_hour: trip.day_cutoff_hour,
      departure_alert_minutes: trip.departure_alert_minutes,
      note: trip.note,
    },
    days: [...days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((day) => ({
        day_number: day.day_number,
        date: day.date,
        title: day.title,
        stops: stops
          .filter((s) => s.trip_day_id === day.id)
          .sort(compareStops)
          .map((s, i): FileStop => {
            const base: FileStop = {
              name: s.name,
              type: s.stop_type,
              maps_query: s.maps_query,
              maps_url: s.maps_url,
              latitude: s.latitude,
              longitude: s.longitude,
              note: s.note,
              duration_minutes: s.duration_minutes,
            };
            if (i === 0) return { ...base, duration_minutes: 0, depart_at: local(s.planned_departure_at) };
            return {
              ...base,
              travel_minutes: s.travel_minutes,
              fixed_arrive_at: s.is_fixed ? local(s.planned_arrival_at) : undefined,
              planned_arrive_at: s.is_fixed ? undefined : local(s.planned_arrival_at),
              planned_depart_at: local(s.planned_departure_at),
              status: s.status === "not_started" ? undefined : s.status,
              started_at: s.started_at,
              completed_at: s.completed_at,
              travel_needs_review: s.travel_needs_review || undefined,
            };
          }),
      })),
  };
}
