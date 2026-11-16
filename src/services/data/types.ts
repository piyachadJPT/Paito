import type { Tables } from "@/services/supabase/types";

/** Local rows mirror the Supabase rows exactly (same columns, same names). */
export type TripRow = Tables<"trips">;
export type DayRow = Tables<"trip_days">;
export type StopRow = Tables<"trip_stops">;

export type SyncedTable = "trips" | "trip_days" | "trip_stops";

export interface RowByTable {
  trips: TripRow;
  trip_days: DayRow;
  trip_stops: StopRow;
}

export type OutboxStatus = "pending" | "failed";

/**
 * One queued write (SPEC §7). A multi-row change (recalc, shift, reorder)
 * is one op that upserts several rows.
 */
export interface OutboxOp {
  /** Auto-increment: flush order */
  seq?: number;
  id: string;
  table: SyncedTable;
  op: "upsert" | "delete";
  /** Full rows for upsert; { id } for delete */
  rows: Record<string, unknown>[];
  /** Row ids this op touches (pull keeps local values for these) */
  rowIds: string[];
  createdAt: string;
  attempts: number;
  lastError: string | null;
  status: OutboxStatus;
}

export interface MetaEntry {
  key: MetaKey;
  value: unknown;
}

export type MetaKey = "activeTripId" | "lastPulledAt" | "lastSyncedAt";

export type Change =
  | { [K in SyncedTable]: { table: K; op: "upsert"; rows: RowByTable[K][] } }[SyncedTable]
  | { table: SyncedTable; op: "delete"; ids: string[] };
