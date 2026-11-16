/**
 * Engine-facing shapes. Structurally compatible with the DB rows
 * (timestamps are ISO strings as stored), but independent of services/.
 */

export type StopType = "sight" | "food" | "rest" | "lodging";
export type StopStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface ScheduleStop {
  id: string;
  trip_id: string;
  trip_day_id: string;
  sort_order: number;
  created_at: string;
  name: string;
  stop_type: StopType;
  travel_minutes: number | null;
  travel_needs_review: boolean;
  duration_minutes: number;
  is_fixed: boolean;
  planned_arrival_at: string | null;
  planned_departure_at: string | null;
  status: StopStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface ScheduleTrip {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  timezone: string;
  day_cutoff_hour: number;
  departure_alert_minutes: number;
}

export interface ScheduleDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string; // YYYY-MM-DD
  title?: string | null;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
