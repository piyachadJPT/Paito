import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTripFile } from "@/lib/import/import-schema";
import { shiftFrom } from "@/lib/schedule/shift";
import { getDayStops } from "@/lib/schedule/util";
import { iso, rawSeed } from "@/test/seed";
import { PaitoDB } from "./db";
import { applyChanges, clearLocal, getMeta, onLocalChange, setMeta } from "./local";
import { classifyRemoteError, type FetchAllResult, type RemoteClient, type RemoteResult } from "./remote";
import { createTrip, deleteTrip, exportTrip, getActiveTripId, importTrip, setActiveTrip, updateTrip, type RepoDeps } from "./repo";
import { PULL_MIN_INTERVAL_MS, SyncEngine, mergeRemote, pickDefaultTrip } from "./sync";
import type { SyncedTable, TripRow } from "./types";

let db: PaitoDB;
let n = 0;
let now = Date.parse("2026-11-20T03:00:00Z");

const deps = (): RepoDeps => ({
  db,
  userId: "user-1",
  newId: () => `id-${++n}`,
  nowIso: () => new Date(now).toISOString(),
});

beforeEach(async () => {
  db = new PaitoDB(`test-${Math.random()}`);
  await db.open();
});

afterEach(async () => {
  db.close();
});

function seedFile() {
  const r = parseTripFile(rawSeed);
  if (!r.ok) throw new Error("seed invalid");
  return r.file;
}

/** In-memory server with scripted failures. */
class FakeRemote implements RemoteClient {
  tables: Record<SyncedTable, Map<string, Record<string, unknown>>> = {
    trips: new Map(),
    trip_days: new Map(),
    trip_stops: new Map(),
  };
  calls: string[] = [];
  /** Results to return for the next send calls, in order; then ok */
  script: RemoteResult[] = [];
  fetchScript: (FetchAllResult | null)[] = [];
  refreshOk = true;

  async upsert(table: SyncedTable, rows: Record<string, unknown>[]) {
    this.calls.push(`upsert:${table}:${rows.length}`);
    const r = this.script.shift() ?? { ok: true };
    if (r.ok) rows.forEach((row) => this.tables[table].set(row.id as string, { ...row }));
    return r;
  }
  async delete(table: SyncedTable, ids: string[]) {
    this.calls.push(`delete:${table}:${ids.length}`);
    const r = this.script.shift() ?? { ok: true };
    if (r.ok) ids.forEach((id) => this.tables[table].delete(id));
    return r;
  }
  async fetchAll(): Promise<FetchAllResult> {
    this.calls.push("fetchAll");
    const scripted = this.fetchScript.shift();
    if (scripted) return scripted;
    return {
      ok: true,
      trips: [...this.tables.trips.values()] as unknown as TripRow[],
      trip_days: [...this.tables.trip_days.values()] as never,
      trip_stops: [...this.tables.trip_stops.values()] as never,
    };
  }
  async refreshSession() {
    this.calls.push("refresh");
    return this.refreshOk;
  }
}

function engine(remote: RemoteClient) {
  const timers: { fn: () => void; ms: number }[] = [];
  const onPulled = vi.fn();
  const e = new SyncEngine(db, remote, {
    now: () => now,
    setTimer: (fn, ms) => timers.push({ fn, ms }),
    clearTimer: () => undefined,
    onPulled,
  });
  return { e, timers, onPulled };
}

describe("applyChanges (outbox)", () => {
  it("writes locally and queues one op per change, in order", async () => {
    const listener = vi.fn();
    const off = onLocalChange(listener);
    await createTrip(deps(), { name: "ทริป", start_date: "2027-02-01", end_date: "2027-02-03" });
    off();

    expect(await db.trips.count()).toBe(1);
    expect(await db.trip_days.count()).toBe(3);
    expect(await db.trip_stops.count()).toBe(3);
    const ops = await db.outbox.orderBy("seq").toArray();
    expect(ops.map((o) => [o.table, o.op, o.rows.length, o.status])).toEqual([
      ["trips", "upsert", 1, "pending"],
      ["trip_days", "upsert", 3, "pending"],
      ["trip_stops", "upsert", 3, "pending"],
    ]);
    expect(ops[1].rowIds).toHaveLength(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("delete changes remove local rows and queue ids", async () => {
    const tripId = await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    await applyChanges(db, [{ table: "trips", op: "delete", ids: [tripId] }], deps());
    expect(await db.trips.count()).toBe(0);
    const last = await db.outbox.orderBy("seq").last();
    expect(last).toMatchObject({ op: "delete", rows: [{ id: tripId }], rowIds: [tripId] });
  });

  it("skips empty changes", async () => {
    await applyChanges(db, [{ table: "trips", op: "upsert", rows: [] }], deps());
    expect(await db.outbox.count()).toBe(0);
  });
});

describe("repositories", () => {
  it("createTrip: days for every date, an origin per day at 08:00, user_id set, active", async () => {
    const id = await createTrip(deps(), { name: " ทริปใหม่ ", start_date: "2026-12-31", end_date: "2027-01-01" });
    const trip = await db.trips.get(id);
    expect(trip).toMatchObject({ name: "ทริปใหม่", user_id: "user-1", timezone: "Asia/Bangkok", departure_alert_minutes: 15 });
    const days = await db.trip_days.where("trip_id").equals(id).sortBy("day_number");
    expect(days.map((d) => d.date)).toEqual(["2026-12-31", "2027-01-01"]);
    const origins = await db.trip_stops.where("trip_id").equals(id).toArray();
    expect(origins.map((o) => [o.name, o.stop_type, o.planned_departure_at])).toEqual([
      ["จุดออกเดินทาง", "lodging", iso("2026-12-31T08:00")],
      ["จุดออกเดินทาง", "lodging", iso("2027-01-01T08:00")],
    ]);
    expect(await getActiveTripId(db)).toBe(id);
  });

  it("createTrip validates input", async () => {
    await expect(createTrip(deps(), { name: " ", start_date: "2027-01-01", end_date: "2027-01-01" })).rejects.toThrow("ชื่อ");
    await expect(createTrip(deps(), { name: "x", start_date: "2027-01-02", end_date: "2027-01-01" })).rejects.toThrow("วันจบ");
    await expect(createTrip(deps(), { name: "x", start_date: "2027-01-01", end_date: "2027-06-01" })).rejects.toThrow("60");
  });

  it("importTrip: seed rows land locally with user_id and become active", async () => {
    const id = await importTrip(deps(), seedFile());
    expect(await db.trip_stops.where("trip_id").equals(id).count()).toBe(25);
    expect((await db.trip_stops.toArray()).every((s) => s.user_id === "user-1")).toBe(true);
    expect(await getActiveTripId(db)).toBe(id);
  });

  it("updateTrip patches and queues the row", async () => {
    const id = await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    now += 60_000;
    await updateTrip(deps(), id, { note: "เบอร์โทร 0812345678", departure_alert_minutes: 20 });
    const trip = await db.trips.get(id);
    expect(trip).toMatchObject({ note: "เบอร์โทร 0812345678", departure_alert_minutes: 20, updated_at: new Date(now).toISOString() });
    expect((await db.outbox.orderBy("seq").last())?.table).toBe("trips");
    await expect(updateTrip(deps(), "missing", { note: "" })).rejects.toThrow();
  });

  it("export → import round trip keeps the plan, status and extras (D10)", async () => {
    const id = await importTrip(deps(), seedFile());
    const all = await db.trip_stops.where("trip_id").equals(id).toArray();
    const temple = all.find((s) => s.name === "วัดพระธาตุลำปางหลวง")!;
    const done = {
      ...temple,
      status: "completed" as const,
      started_at: iso("2026-12-31T09:30"),
      completed_at: iso("2026-12-31T11:00"),
      latitude: 18.217236,
      longitude: 99.390584,
      maps_url: "https://maps.app.goo.gl/x",
    };
    // Shift the rest of the day the way the app does (anchor = completed temple)
    const day1 = getDayStops(all.map((s) => (s.id === done.id ? done : s)), temple.trip_day_id);
    const shifted = shiftFrom(day1, done.id, Date.parse(iso("2026-12-31T11:05")));
    await db.trip_stops.bulkPut(shifted.changed);

    const file = await exportTrip(db, id);
    const reparsed = parseTripFile(JSON.parse(JSON.stringify(file)));
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;

    const copyId = await importTrip(deps(), reparsed.file);
    const copy = await db.trip_stops.where("trip_id").equals(copyId).toArray();
    const original = await db.trip_stops.where("trip_id").equals(id).toArray();
    const pick = (s: (typeof copy)[number]) => [s.name, s.status, s.planned_arrival_at, s.planned_departure_at, s.is_fixed, s.latitude, s.maps_url, s.started_at];
    expect(copy.map(pick).sort()).toEqual(original.map(pick).sort());
    await expect(exportTrip(db, "missing")).rejects.toThrow();
  });

  it("deleteTrip: removes the trip, its days and stops, drops its queued writes, queues one delete", async () => {
    const keep = await createTrip(deps(), { name: "เก็บไว้", start_date: "2027-03-01", end_date: "2027-03-01" });
    const gone = await importTrip(deps(), seedFile()); // active now, writes still queued
    await deleteTrip(deps(), gone);

    expect(await db.trips.get(gone)).toBeUndefined();
    expect(await db.trip_days.where("trip_id").equals(gone).count()).toBe(0);
    expect(await db.trip_stops.where("trip_id").equals(gone).count()).toBe(0);
    const ops = await db.outbox.orderBy("seq").toArray();
    expect(ops.filter((o) => o.rowIds.includes(gone) && o.op === "upsert")).toEqual([]);
    expect(ops[ops.length - 1]).toMatchObject({ table: "trips", op: "delete", rowIds: [gone] });
    expect(ops.filter((o) => o.rowIds.includes(keep))).toHaveLength(1); // the other trip's writes stay
    expect(await getActiveTripId(db)).toBe(keep);
  });

  it("deleteTrip of the last trip clears the active trip; sync sends the delete", async () => {
    const id = await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    const { e } = engine(remote);
    await e.sync({ pull: false });
    await deleteTrip(deps(), id);
    expect(await getActiveTripId(db)).toBeUndefined();
    await e.sync({ pull: false });
    expect(remote.calls[remote.calls.length - 1]).toBe("delete:trips:1");
    expect(remote.tables.trips.size).toBe(0);
  });

  it("setActiveTrip / clearLocal", async () => {
    await setActiveTrip(db, "abc");
    expect(await getActiveTripId(db)).toBe("abc");
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    await clearLocal(db);
    expect(await db.trips.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    expect(await getActiveTripId(db)).toBeUndefined();
  });
});

describe("SyncEngine.flush", () => {
  it("pushes ops in order and empties the outbox", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-02" });
    const remote = new FakeRemote();
    const { e } = engine(remote);
    await e.sync({ pull: false });
    expect(remote.calls).toEqual(["upsert:trips:1", "upsert:trip_days:2", "upsert:trip_stops:2"]);
    expect(await db.outbox.count()).toBe(0);
    expect(e.getState().phase).toBe("idle");
    expect(await getMeta(db, "lastSyncedAt")).toBe(now);
  });

  it("network failure stops, keeps the op, and schedules a backoff retry", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    remote.script = [{ ok: false, kind: "network", message: "Failed to fetch" }];
    const { e, timers } = engine(remote);
    await e.sync();
    expect(remote.calls).toEqual(["upsert:trips:1"]); // stopped at the first op
    expect(await db.outbox.count()).toBe(3);
    expect((await db.outbox.orderBy("seq").first())?.attempts).toBe(1);
    expect(e.getState()).toMatchObject({ phase: "offline", lastError: "Failed to fetch", nextRetryAt: now + 2000 });
    expect(timers.map((t) => t.ms)).toEqual([2000]);

    remote.script = [{ ok: false, kind: "retry", message: "503" }];
    timers[0].fn();
    await vi.waitFor(() => expect(timers).toHaveLength(2));
    expect(timers[1].ms).toBe(4000); // exponential
  });

  it("4xx marks the op failed and continues with the rest", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    remote.script = [{ ok: true }, { ok: false, kind: "rejected", message: "violates foreign key" }];
    const { e } = engine(remote);
    await e.sync({ pull: false });
    const left = await db.outbox.toArray();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ table: "trip_days", status: "failed", lastError: "violates foreign key", attempts: 1 });
    expect(remote.calls).toHaveLength(3);
    expect(e.getState().phase).toBe("idle");
  });

  it("retry puts a failed op back; discard drops it", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    remote.script = [{ ok: false, kind: "rejected", message: "bad" }];
    const { e } = engine(remote);
    await e.sync({ pull: false });
    const failed = (await db.outbox.toArray())[0];
    expect(failed.status).toBe("failed");

    await e.retry(failed.id);
    expect(await db.outbox.count()).toBe(0); // succeeded this time

    remote.script = [{ ok: false, kind: "rejected", message: "bad again" }];
    await updateTrip(deps(), (await db.trips.toArray())[0].id, { note: "n" });
    await e.sync({ pull: false });
    const again = (await db.outbox.toArray())[0];
    await e.discard(again.id);
    expect(await db.outbox.count()).toBe(0);
  });

  it("expired JWT: refreshes the session and retries the same op", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    remote.script = [{ ok: false, kind: "auth", message: "JWT expired" }];
    const { e } = engine(remote);
    await e.sync({ pull: false });
    expect(remote.calls.slice(0, 3)).toEqual(["upsert:trips:1", "refresh", "upsert:trips:1"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("auth that cannot be refreshed stops without failing ops", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    remote.refreshOk = false;
    remote.script = [{ ok: false, kind: "auth", message: "JWT expired" }];
    const { e, timers } = engine(remote);
    await e.sync();
    expect(e.getState().phase).toBe("auth_required");
    expect(timers).toHaveLength(0);
    expect((await db.outbox.toArray()).every((o) => o.status === "pending")).toBe(true);
  });

  it("coalesces concurrent sync calls", async () => {
    await createTrip(deps(), { name: "x", start_date: "2027-02-01", end_date: "2027-02-01" });
    const remote = new FakeRemote();
    const { e } = engine(remote);
    await Promise.all([e.sync({ pull: false }), e.sync({ pull: false }), e.sync({ pull: false })]);
    expect(remote.calls.filter((c) => c.startsWith("upsert:trips"))).toHaveLength(1);
  });
});

describe("pull + merge", () => {
  async function serverWithSeed() {
    const remote = new FakeRemote();
    await importTrip(deps(), seedFile());
    const { e } = engine(remote);
    await e.sync({ force: true });
    return { remote, e };
  }

  it("pulls on first sync and is throttled to every 30 s unless forced", async () => {
    const { remote, e } = await serverWithSeed();
    expect(remote.calls.filter((c) => c === "fetchAll")).toHaveLength(1);
    await e.sync();
    expect(remote.calls.filter((c) => c === "fetchAll")).toHaveLength(1);
    now += PULL_MIN_INTERVAL_MS;
    await e.sync();
    expect(remote.calls.filter((c) => c === "fetchAll")).toHaveLength(2);
    await e.sync({ force: true });
    expect(remote.calls.filter((c) => c === "fetchAll")).toHaveLength(3);
  });

  it("server changes overwrite local rows (last write wins)", async () => {
    const { remote, e } = await serverWithSeed();
    const trip = [...remote.tables.trips.values()][0];
    remote.tables.trips.set(trip.id as string, { ...trip, note: "แก้จากอีกเครื่อง" });
    await e.sync({ force: true });
    expect((await db.trips.get(trip.id as string))?.note).toBe("แก้จากอีกเครื่อง");
  });

  it("rows with a queued op keep their local value", async () => {
    const { remote, e } = await serverWithSeed();
    const trip = [...remote.tables.trips.values()][0];
    remote.tables.trips.set(trip.id as string, { ...trip, note: "server" });
    remote.script = [{ ok: false, kind: "network", message: "offline" }];
    await updateTrip(deps(), trip.id as string, { note: "local, not sent yet" });
    await e.sync({ force: true }); // flush fails → no pull happens
    await mergeRemote(db, await (remote.fetchAll() as Promise<Extract<FetchAllResult, { ok: true }>>), now);
    expect((await db.trips.get(trip.id as string))?.note).toBe("local, not sent yet");
  });

  it("removes local rows deleted on the server, but not queued new ones", async () => {
    const { remote, e } = await serverWithSeed();
    const stop = [...remote.tables.trip_stops.values()][3];
    remote.tables.trip_stops.delete(stop.id as string);
    remote.script = [{ ok: false, kind: "network", message: "offline" }];
    const newTrip = await createTrip(deps(), { name: "ใหม่", start_date: "2027-03-01", end_date: "2027-03-01" });
    await e.sync({ force: true });
    await mergeRemote(db, (await remote.fetchAll()) as Extract<FetchAllResult, { ok: true }>, now);
    expect(await db.trip_stops.get(stop.id as string)).toBeUndefined();
    expect(await db.trips.get(newTrip)).toBeDefined();
  });

  it("picks an active trip after the first pull on a new device", async () => {
    const { remote } = await serverWithSeed();
    const other = new PaitoDB(`fresh-${Math.random()}`);
    await other.open();
    const snap = (await remote.fetchAll()) as Extract<FetchAllResult, { ok: true }>;
    await mergeRemote(other, snap, now);
    expect(await getActiveTripId(other)).toBe(snap.trips[0].id);
    expect(await other.trip_stops.count()).toBe(25);
    other.close();
  });

  it("pull network failure → offline with backoff; onPulled only on success", async () => {
    const remote = new FakeRemote();
    remote.fetchScript = [{ ok: false, kind: "network", message: "offline" }];
    const { e, onPulled, timers } = engine(remote);
    await e.sync({ force: true });
    expect(e.getState().phase).toBe("offline");
    expect(onPulled).not.toHaveBeenCalled();
    expect(timers).toHaveLength(1);
    await e.sync({ force: true });
    expect(onPulled).toHaveBeenCalledTimes(1);
    e.dispose();
  });

  it("pull with expired JWT refreshes and retries", async () => {
    const remote = new FakeRemote();
    remote.fetchScript = [{ ok: false, kind: "auth", message: "JWT expired" }];
    const { e } = engine(remote);
    await e.sync({ force: true });
    expect(remote.calls).toEqual(["fetchAll", "refresh", "fetchAll"]);
    expect(e.getState().phase).toBe("idle");
  });
});

describe("helpers", () => {
  it.each([
    [0, null, "network"],
    [401, null, "auth"],
    [400, "PGRST301", "auth"],
    [408, null, "retry"],
    [429, null, "retry"],
    [503, null, "retry"],
    [400, "23503", "rejected"],
    [409, "23505", "rejected"],
    [403, "42501", "rejected"],
  ] as const)("classifyRemoteError(%d, %s) → %s", (status, code, kind) => {
    expect(classifyRemoteError(status, code)).toBe(kind);
  });

  it("pickDefaultTrip: running, else upcoming, else latest", () => {
    const t = (id: string, start: string, end: string) => ({ id, start_date: start, end_date: end }) as TripRow;
    const trips = [t("past", "2026-01-01", "2026-01-03"), t("next", "2027-03-01", "2027-03-02"), t("soon", "2026-12-31", "2027-01-03")];
    expect(pickDefaultTrip(trips, "2027-01-02")?.id).toBe("soon");
    expect(pickDefaultTrip(trips, "2026-11-20")?.id).toBe("soon");
    expect(pickDefaultTrip([trips[0]], "2026-11-20")?.id).toBe("past");
    expect(pickDefaultTrip([], "2026-11-20")).toBeNull();
  });

  it("meta get/set", async () => {
    await setMeta(db, "lastPulledAt", 5);
    expect(await getMeta(db, "lastPulledAt")).toBe(5);
  });
});
