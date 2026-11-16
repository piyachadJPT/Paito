import Dexie, { type EntityTable } from "dexie";
import type { DayRow, MetaEntry, OutboxOp, StopRow, TripRow } from "./types";

/**
 * On-device store (SPEC §7). The UI always reads from here; Supabase is
 * synced in the background. Bump the version and add a migration when the
 * schema changes.
 */
export class PaitoDB extends Dexie {
  trips!: EntityTable<TripRow, "id">;
  trip_days!: EntityTable<DayRow, "id">;
  trip_stops!: EntityTable<StopRow, "id">;
  outbox!: EntityTable<OutboxOp, "seq">;
  meta!: EntityTable<MetaEntry, "key">;

  constructor(name = "paito") {
    super(name);
    this.version(1).stores({
      trips: "id, updated_at",
      trip_days: "id, trip_id, [trip_id+day_number]",
      trip_stops: "id, trip_id, trip_day_id",
      outbox: "++seq, &id, status, table",
      meta: "key",
    });
  }
}

export const db = new PaitoDB();
