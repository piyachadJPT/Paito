import type { PlanChange } from "@/lib/schedule/plan-edit";
import { applyStatusAction, type StatusAction, type StatusResult } from "@/lib/schedule/status";
import { applyChanges } from "./local";
import type { RepoDeps } from "./repo";
import type { Change, StopRow } from "./types";

export type Undo = () => Promise<void>;

function stamp(rows: StopRow[], nowIso: string): StopRow[] {
  return rows.map((r) => ({ ...r, updated_at: nowIso }));
}

async function write(deps: RepoDeps, upserts: StopRow[], deletes: string[]): Promise<void> {
  const changes: Change[] = [];
  // Deletes first: a deleted row never blocks a constraint for the rows that follow
  if (deletes.length) changes.push({ table: "trip_stops", op: "delete", ids: deletes });
  if (upserts.length) changes.push({ table: "trip_stops", op: "upsert", rows: stamp(upserts, deps.nowIso()) });
  await applyChanges(deps.db, changes, deps);
}

/** Save a plan edit (one batch) and return its undo. */
export async function savePlanChange(deps: RepoDeps, change: PlanChange<StopRow>): Promise<Undo> {
  await write(deps, change.upserts, change.deletes);
  return () => write(deps, change.undo.upserts, change.undo.deletes);
}

/**
 * Status button press (SPEC §5.5). Returns the result; when ok it is saved
 * and `undo` restores the previous rows.
 */
export async function pressStatus(
  deps: RepoDeps,
  dayStops: StopRow[],
  tripStops: StopRow[],
  stopId: string,
  action: StatusAction,
  now: number,
  closeOther = false,
): Promise<{ result: StatusResult<StopRow>; undo: Undo | null }> {
  const result = applyStatusAction(dayStops, tripStops, stopId, action, now, { closeOther });
  if (!result.ok) return { result, undo: null };
  await write(deps, result.updates, []);
  // Undo in reverse order: reopen the closed stop only after closing the reopened one
  const restore = [...result.snapshot].reverse();
  return { result, undo: () => write(deps, restore, []) };
}

export interface NewStopInput {
  tripId: string;
  dayId: string;
  name?: string;
}

/** A new stop with the SPEC §10.4 defaults: sight, 60 min, travel not filled in. */
export function newStopRow(deps: RepoDeps, input: NewStopInput): StopRow {
  const now = deps.nowIso();
  return {
    id: deps.newId(),
    user_id: deps.userId,
    trip_id: input.tripId,
    trip_day_id: input.dayId,
    sort_order: 0, // assigned by insertStop
    name: input.name?.trim() || "สถานที่ใหม่",
    stop_type: "sight",
    maps_query: null,
    maps_url: null,
    latitude: null,
    longitude: null,
    travel_minutes: null,
    travel_needs_review: false,
    duration_minutes: 60,
    is_fixed: false,
    planned_arrival_at: null,
    planned_departure_at: null,
    status: "not_started",
    started_at: null,
    completed_at: null,
    note: null,
    created_at: now,
    updated_at: now,
  };
}
