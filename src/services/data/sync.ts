import type { PaitoDB } from "./db";
import { getMeta, setMeta } from "./local";
import type { RemoteClient, RemoteErrorKind } from "./remote";
import type { OutboxOp, SyncedTable, TripRow } from "./types";

export const PULL_MIN_INTERVAL_MS = 30_000;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 5 * 60_000;

export type SyncPhase = "idle" | "syncing" | "offline" | "auth_required";

export interface SyncState {
  phase: SyncPhase;
  /** Last network/auth problem, for display */
  lastError: string | null;
  /** When the next automatic retry will run (ms), if scheduled */
  nextRetryAt: number | null;
}

export interface SyncDeps {
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  /** Called after a pull changed local data (e.g. refresh the auth gate) */
  onPulled?(): void;
}

type FlushOutcome = "done" | "network" | "auth";

const TABLES: SyncedTable[] = ["trips", "trip_days", "trip_stops"];

/**
 * Push the outbox in order, then pull and merge (SPEC §7). iOS has no
 * Background Sync: callers trigger this on open, `online`, visibility and
 * after local writes.
 */
export class SyncEngine {
  private state: SyncState = { phase: "idle", lastError: null, nextRetryAt: null };
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private rerun: { pull: boolean; force: boolean } | null = null;
  private failures = 0;
  private retryTimer: unknown = null;

  constructor(
    private readonly db: PaitoDB,
    private readonly remote: RemoteClient,
    private readonly deps: SyncDeps,
  ) {}

  getState = (): SyncState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Flush, then pull if `pull` and (forced or ≥ 30 s since the last pull).
   * Concurrent calls coalesce into one follow-up run.
   */
  sync(options: { pull?: boolean; force?: boolean } = {}): Promise<void> {
    const want = { pull: options.pull ?? true, force: options.force ?? false };
    if (this.running) {
      this.rerun = {
        pull: want.pull || (this.rerun?.pull ?? false),
        force: want.force || (this.rerun?.force ?? false),
      };
      return this.running;
    }
    this.running = this.loop(want).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Runs once, then again while calls arrived meanwhile (callers await all of it). */
  private async loop(first: { pull: boolean; force: boolean }): Promise<void> {
    let next: { pull: boolean; force: boolean } | null = first;
    while (next) {
      this.rerun = null;
      await this.run(next);
      next = this.rerun;
    }
  }

  /** Put a failed op back in the queue. */
  async retry(opId: string): Promise<void> {
    await this.db.outbox.where("id").equals(opId).modify({ status: "pending", attempts: 0, lastError: null });
    await this.sync({ pull: false });
  }

  /** Drop a failed op; the next pull restores the server's version of those rows. */
  async discard(opId: string): Promise<void> {
    await this.db.outbox.where("id").equals(opId).delete();
    await this.sync({ pull: true, force: true });
  }

  dispose(): void {
    if (this.retryTimer !== null) this.deps.clearTimer(this.retryTimer);
    this.retryTimer = null;
    this.listeners.clear();
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private async run({ pull, force }: { pull: boolean; force: boolean }): Promise<void> {
    this.cancelRetry();
    this.setState({ phase: "syncing" });

    const flushed = await this.flush();
    if (flushed !== "done") return this.stop(flushed);

    if (pull) {
      const last = (await getMeta<number>(this.db, "lastPulledAt")) ?? 0;
      if (force || this.deps.now() - last >= PULL_MIN_INTERVAL_MS) {
        const pulled = await this.pull();
        if (pulled !== "done") return this.stop(pulled);
      }
    }

    this.failures = 0;
    await setMeta(this.db, "lastSyncedAt", this.deps.now());
    this.setState({ phase: "idle", lastError: null, nextRetryAt: null });
  }

  private async flush(): Promise<FlushOutcome> {
    const ops = await this.db.outbox.where("status").equals("pending").sortBy("seq");
    for (const op of ops) {
      let res = await this.send(op);
      if (!res.ok && res.kind === "auth" && (await this.remote.refreshSession())) {
        res = await this.send(op);
      }
      if (res.ok) {
        await this.db.outbox.delete(op.seq!);
        continue;
      }
      if (res.kind === "rejected") {
        await this.db.outbox.update(op.seq!, { status: "failed", attempts: op.attempts + 1, lastError: res.message });
        continue; // a bad op must not block the rest
      }
      await this.db.outbox.update(op.seq!, { attempts: op.attempts + 1, lastError: res.message });
      this.setState({ lastError: res.message });
      return res.kind === "auth" ? "auth" : "network";
    }
    return "done";
  }

  private send(op: OutboxOp) {
    return op.op === "upsert" ? this.remote.upsert(op.table, op.rows) : this.remote.delete(op.table, op.rowIds);
  }

  private async pull(): Promise<FlushOutcome> {
    let res = await this.remote.fetchAll();
    if (!res.ok && res.kind === "auth" && (await this.remote.refreshSession())) res = await this.remote.fetchAll();
    if (!res.ok) {
      this.setState({ lastError: res.message });
      return kindToOutcome(res.kind);
    }
    await mergeRemote(this.db, res, this.deps.now());
    this.deps.onPulled?.();
    return "done";
  }

  private stop(outcome: Exclude<FlushOutcome, "done">) {
    if (outcome === "auth") {
      this.setState({ phase: "auth_required", nextRetryAt: null });
      return;
    }
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** this.failures);
    this.failures++;
    const at = this.deps.now() + delay;
    this.retryTimer = this.deps.setTimer(() => {
      this.retryTimer = null;
      void this.sync({ pull: true });
    }, delay);
    this.setState({ phase: "offline", nextRetryAt: at });
  }

  private cancelRetry() {
    if (this.retryTimer !== null) this.deps.clearTimer(this.retryTimer);
    this.retryTimer = null;
  }
}

function kindToOutcome(kind: RemoteErrorKind): Exclude<FlushOutcome, "done"> {
  return kind === "auth" ? "auth" : "network";
}

export interface RemoteSnapshot {
  trips: TripRow[];
  trip_days: Record<string, unknown>[];
  trip_stops: Record<string, unknown>[];
}

/**
 * Merge server rows into the device (last write wins), except rows that
 * still have a queued op — those keep their local value. Local rows missing
 * on the server (deleted elsewhere) are removed unless queued.
 */
export async function mergeRemote(db: PaitoDB, snapshot: RemoteSnapshot, now: number): Promise<void> {
  await db.transaction("rw", [db.trips, db.trip_days, db.trip_stops, db.outbox, db.meta], async () => {
    const queued = new Set((await db.outbox.toArray()).flatMap((op) => op.rowIds));

    for (const table of TABLES) {
      const serverRows = snapshot[table] as { id: string }[];
      const serverIds = new Set(serverRows.map((r) => r.id));
      const localIds = (await db.table(table).toCollection().primaryKeys()) as string[];

      await db.table(table).bulkPut(serverRows.filter((r) => !queued.has(r.id)));
      await db.table(table).bulkDelete(localIds.filter((id) => !serverIds.has(id) && !queued.has(id)));
    }

    await setMeta(db, "lastPulledAt", now);

    const active = await getMeta<string>(db, "activeTripId");
    if (!active || !(await db.trips.get(active))) {
      const trips = await db.trips.toArray();
      const pick = pickDefaultTrip(trips, new Date(now).toISOString().slice(0, 10));
      if (pick) await setMeta(db, "activeTripId", pick.id);
    }
  });
}

/** The trip running today, else the next upcoming one, else the latest. */
export function pickDefaultTrip(trips: readonly TripRow[], today: string): TripRow | null {
  if (trips.length === 0) return null;
  const running = trips.find((t) => t.start_date <= today && today <= t.end_date);
  if (running) return running;
  const upcoming = trips.filter((t) => t.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming[0]) return upcoming[0];
  return [...trips].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
}
