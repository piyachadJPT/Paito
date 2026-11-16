/**
 * Timezone-aware formatting and conversion.
 *
 * Every displayed time goes through here with an explicit IANA timezone
 * (the trip's), never the device's or server's. Pure: no clock access.
 */

export const DEFAULT_TIMEZONE = "Asia/Bangkok";
const LOCALE = "th-TH";

export type Instant = Date | number | string;

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

function toMs(instant: Instant): number {
  const ms = instant instanceof Date ? instant.getTime() : new Date(instant).getTime();
  if (Number.isNaN(ms)) throw new RangeError(`Invalid instant: ${String(instant)}`);
  return ms;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(
  key: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  locale = LOCALE,
): Intl.DateTimeFormat {
  const cacheKey = `${locale}|${timeZone}|${key}`;
  let fmt = formatterCache.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { timeZone, ...options });
    formatterCache.set(cacheKey, fmt);
  }
  return fmt;
}

/** Calendar/clock fields of an instant as seen in `timeZone` (Gregorian). */
export function getZonedParts(instant: Instant, timeZone: string): ZonedParts {
  const parts = formatter("parts", timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }, "en-US").formatToParts(toMs(instant));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** "YYYY-MM-DD" (Gregorian) of an instant in `timeZone`. */
export function toDateKey(instant: Instant, timeZone: string): string {
  const { year, month, day } = getZonedParts(instant, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Offset of `timeZone` from UTC at `ms`, in milliseconds (Bangkok = +7h). */
function offsetAt(ms: number, timeZone: string): number {
  const p = getZonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000));
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Convert a wall-clock time in `timeZone` ("YYYY-MM-DDTHH:MM[:SS]", no offset)
 * to the instant it denotes. Works for any IANA zone, including DST.
 * A time inside a DST gap resolves to the instant just after the gap.
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = LOCAL_RE.exec(local);
  if (!m) throw new RangeError(`Invalid local time: ${local}`);
  const [, y, mo, d, h, mi, s] = m;
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);

  const firstGuess = wall - offsetAt(wall, timeZone);
  const secondOffset = offsetAt(firstGuess, timeZone);
  const secondGuess = wall - secondOffset;
  if (offsetAt(secondGuess, timeZone) === secondOffset) return new Date(secondGuess);
  // DST gap: neither offset round-trips; use the later one.
  return new Date(Math.max(firstGuess, secondGuess));
}

/** "13:30 น." */
export function formatTime(instant: Instant, timeZone: string): string {
  const text = formatter("time", timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(toMs(instant));
  return `${text} น.`;
}

/** "ศ. 1 ม.ค. 2570" — Buddhist-era year via th-TH. */
export function formatDate(instant: Instant, timeZone: string): string {
  return formatter("date", timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(toMs(instant));
}

/** "31 ธ.ค." */
export function formatDayMonth(instant: Instant, timeZone: string): string {
  return formatter("daymonth", timeZone, { day: "numeric", month: "short" }).format(toMs(instant));
}

/**
 * Format a calendar date ("YYYY-MM-DD", e.g. trip_days.date) — not an instant,
 * so it is independent of any timezone.
 */
export function formatCalendarDate(dateKey: string): string {
  return formatDate(calendarDateToInstant(dateKey), "UTC");
}

/** "31 ธ.ค." for a calendar date. */
export function formatCalendarDayMonth(dateKey: string): string {
  return formatDayMonth(calendarDateToInstant(dateKey), "UTC");
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function calendarDateToInstant(dateKey: string): number {
  const m = DATE_KEY_RE.exec(dateKey);
  if (!m) throw new RangeError(`Invalid date: ${dateKey}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], 12);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
