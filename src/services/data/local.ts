import type { PaitoDB } from "./db";
import type { Change, MetaKey, OutboxOp, SyncedTable } from "./types";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Fired after every local write that queued outbox ops (the sync engine flushes on it). */
export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tell listeners (sync, auth gate) that local data changed outside applyChanges. */
export function notifyLocalChange(): void {
  listeners.forEach((l) => l());
}

export interface ApplyDeps {
  newId: () => string;
  nowIso: () => string;
}

/**
 * Write changes to the device first, and queue them for Supabase, in one
 * transaction (nothing is lost offline). Changes are applied and queued in
 * the given order; one change = one outbox op.
 */
export async function applyChanges(db: PaitoDB, changes: Change[], deps: ApplyDeps): Promise<void> {
  const nonEmpty = changes.filter((c) => (c.op === "upsert" ? c.rows.length > 0 : c.ids.length > 0));
  if (nonEmpty.length === 0) return;

  await db.transaction("rw", [db.trips, db.trip_days, db.trip_stops, db.outbox], async () => {
    for (const change of nonEmpty) {
      const table = db.table(change.table);
      let op: OutboxOp;
      if (change.op === "upsert") {
        await table.bulkPut(change.rows);
        op = newOp(change.table, "upsert", change.rows as unknown as Record<string, unknown>[], change.rows.map((r) => r.id), deps);
      } else {
        await table.bulkDelete(change.ids);
        op = newOp(change.table, "delete", change.ids.map((id) => ({ id })), change.ids, deps);
      }
      await db.outbox.add(op);
    }
  });

  listeners.forEach((l) => l());
}

function newOp(
  table: SyncedTable,
  op: OutboxOp["op"],
  rows: Record<string, unknown>[],
  rowIds: string[],
  deps: ApplyDeps,
): OutboxOp {
  return {
    id: deps.newId(),
    table,
    op,
    rows,
    rowIds,
    createdAt: deps.nowIso(),
    attempts: 0,
    lastError: null,
    status: "pending",
  };
}

export async function getMeta<T>(db: PaitoDB, key: MetaKey): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(db: PaitoDB, key: MetaKey, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** Wipe everything on this device (sign out). */
export async function clearLocal(db: PaitoDB): Promise<void> {
  await db.transaction("rw", [db.trips, db.trip_days, db.trip_stops, db.outbox, db.meta], async () => {
    await Promise.all([db.trips.clear(), db.trip_days.clear(), db.trip_stops.clear(), db.outbox.clear(), db.meta.clear()]);
  });
}
