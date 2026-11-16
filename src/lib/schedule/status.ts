import type { ScheduleStop, StopStatus } from "./types";
import { toIso } from "./util";

export type StatusAction = "arrive" | "complete" | "skip" | "revert";

export interface StatusChange<T extends ScheduleStop> {
  /**
   * Rows to save, in order. A stop being closed always comes before the one
   * being opened, so the "one in_progress per trip" unique index never trips.
   */
  updates: T[];
  /** Previous versions of the same rows — restore to undo */
  snapshot: T[];
}

export type StatusResult<T extends ScheduleStop> =
  | ({ ok: true } & StatusChange<T>)
  /** Another stop is in progress: ask "ปิด {name} เป็นเสร็จแล้วไหม" then retry with closeOther */
  | { ok: false; reason: "other_in_progress"; other: T };

export interface StatusOptions {
  /** Close the other in-progress stop as completed (after the user confirmed) */
  closeOther?: boolean;
}

/** Which buttons a stop offers (SPEC §5.5). The origin has none. */
export function availableActions(stop: ScheduleStop, isOrigin: boolean): StatusAction[] {
  if (isOrigin) return [];
  switch (stop.status) {
    case "not_started":
      return ["arrive", "skip"];
    case "in_progress":
      return ["complete", "skip", "revert"];
    case "completed":
    case "skipped":
      return ["revert"];
  }
}

/**
 * Apply a button press (SPEC §5.5, D8). Status changes only through this —
 * never from the clock. `now` is the device (or simulated) clock at the press.
 *
 * @param dayStops  stops of the stop's day, in order (index 0 = origin)
 * @param tripStops every stop of the trip (to find another in-progress stop)
 */
export function applyStatusAction<T extends ScheduleStop>(
  dayStops: readonly T[],
  tripStops: readonly T[],
  stopId: string,
  action: StatusAction,
  now: number,
  options: StatusOptions = {},
): StatusResult<T> {
  const index = dayStops.findIndex((s) => s.id === stopId);
  if (index < 0) throw new Error(`Stop ${stopId} is not in this day`);
  if (index === 0) throw new Error("The origin has no status");
  const stop = dayStops[index];
  const at = toIso(now);

  const invalid = () => new Error(`Cannot ${action} a stop that is ${stop.status}`);
  const updates: T[] = [];
  const snapshot: T[] = [];
  const push = (before: T, after: T) => {
    snapshot.push({ ...before });
    updates.push(after);
  };

  const openStop = (next: T): StatusResult<T> => {
    const other = tripStops.find((s) => s.status === "in_progress" && s.id !== stop.id);
    if (other) {
      if (!options.closeOther) return { ok: false, reason: "other_in_progress", other };
      push(other, { ...other, status: "completed", completed_at: at });
    }
    push(stop, next);
    return { ok: true, updates, snapshot };
  };

  switch (action) {
    case "arrive": {
      if (stop.status !== "not_started") throw invalid();
      const isLastLodging = index === dayStops.length - 1 && stop.stop_type === "lodging";
      if (isLastLodging) {
        // Arriving at tonight's lodging ends the day right away
        push(stop, { ...stop, status: "completed", started_at: at, completed_at: at });
        return { ok: true, updates, snapshot };
      }
      return openStop({ ...stop, status: "in_progress", started_at: at, completed_at: null });
    }

    case "complete": {
      if (stop.status !== "in_progress") throw invalid();
      push(stop, { ...stop, status: "completed", completed_at: at });
      return { ok: true, updates, snapshot };
    }

    case "skip": {
      if (stop.status !== "not_started" && stop.status !== "in_progress") throw invalid();
      push(stop, withStatus(stop, "skipped"));
      // D8: the next stop's drive now starts somewhere else
      const next = dayStops.slice(index + 1).find((s) => s.status !== "skipped");
      if (next && !next.travel_needs_review) push(next, { ...next, travel_needs_review: true });
      return { ok: true, updates, snapshot };
    }

    case "revert": {
      if (stop.status === "completed") {
        return openStop({ ...stop, status: "in_progress", completed_at: null });
      }
      if (stop.status === "in_progress" || stop.status === "skipped") {
        push(stop, { ...stop, status: "not_started", started_at: null, completed_at: null });
        return { ok: true, updates, snapshot };
      }
      throw invalid();
    }
  }
}

function withStatus<T extends ScheduleStop>(stop: T, status: StopStatus): T {
  return { ...stop, status };
}
