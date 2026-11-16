import { toDateKey } from "@/lib/time";
import { HOUR } from "./types";

/**
 * The trip's "service day" (SPEC §5.7): the calendar date in the trip
 * timezone of (now − cutoff hours). With cutoff 4, 00:30 on 1 Jan is still
 * 31 Dec.
 */
export function getServiceDate(now: number, timeZone: string, cutoffHour: number): string {
  return toDateKey(now - cutoffHour * HOUR, timeZone);
}
