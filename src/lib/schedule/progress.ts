import type { ScheduleStop } from "./types";

export interface Progress {
  /** sight + food stops of the day */
  total: number;
  /** of those, completed */
  done: number;
  /** of those, skipped (shown separately: "ข้าม 1") */
  skipped: number;
}

const COUNTED: ReadonlySet<ScheduleStop["stop_type"]> = new Set(["sight", "food"]);

/** SPEC §5.4 rule 5: lodging and rest stops (incl. the origin) are not counted. */
export function computeProgress(dayStops: readonly ScheduleStop[]): Progress {
  const counted = dayStops.filter((s) => COUNTED.has(s.stop_type));
  return {
    total: counted.length,
    done: counted.filter((s) => s.status === "completed").length,
    skipped: counted.filter((s) => s.status === "skipped").length,
  };
}

export function sumProgress(items: readonly Progress[]): Progress {
  return items.reduce(
    (acc, p) => ({ total: acc.total + p.total, done: acc.done + p.done, skipped: acc.skipped + p.skipped }),
    { total: 0, done: 0, skipped: 0 },
  );
}
