import { MINUTE } from "./types";

/** "1 ชม. 5 นาที" / "2 ชม." / "42 นาที" for whole minutes ≥ 0. */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  if (hours === 0) return `${minutes} นาที`;
  return minutes === 0 ? `${hours} ชม.` : `${hours} ชม. ${minutes} นาที`;
}

/**
 * Countdown text (SPEC §5.6, D4). Minutes are floored (leaves the user slack).
 * - ≥ 60 min  → "1 ชม. 52 นาที" ("2 ชม.")
 * - 10–59 min → "42 นาที"
 * - < 10 min  → "08:42" (mm:ss)
 * - negative  → "เกินมา 7 นาที" (minutes only, never seconds)
 */
export function formatDuration(ms: number): string {
  if (ms < 0) {
    const overMinutes = Math.floor(-ms / MINUTE);
    return overMinutes === 0 ? "เกินมาไม่ถึง 1 นาที" : `เกินมา ${formatMinutes(overMinutes)}`;
  }
  const totalMinutes = Math.floor(ms / MINUTE);
  if (totalMinutes >= 10) return formatMinutes(totalMinutes);
  const seconds = Math.floor((ms % MINUTE) / 1000);
  return `${String(totalMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
