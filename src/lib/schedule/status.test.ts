import { describe, expect, it } from "vitest";
import { at, iso, loadSeed, withUpdates } from "@/test/seed";
import { applyStatusAction, availableActions } from "./status";

const seed = loadSeed();
const NOW = at("2026-12-31T09:30");

function setup() {
  const stops = seed.stops.map((s) => ({ ...s }));
  const day1 = seed.dayStops(1, stops);
  return { stops, day1, temple: day1[1], museum: day1[2], lastLodging: day1[day1.length - 1] };
}

function ok<T>(r: T): Extract<T, { ok: true }> {
  if (!(r as { ok: boolean }).ok) throw new Error("expected ok");
  return r as Extract<T, { ok: true }>;
}

describe("applyStatusAction", () => {
  it("arrive → in_progress with started_at = now", () => {
    const { stops, day1, temple } = setup();
    const r = ok(applyStatusAction(day1, stops, temple.id, "arrive", NOW));
    expect(r.updates).toEqual([{ ...temple, status: "in_progress", started_at: iso("2026-12-31T09:30"), completed_at: null }]);
    expect(r.snapshot).toEqual([temple]);
  });

  it("arriving at the last lodging of the day completes it right away", () => {
    const { stops, day1, lastLodging } = setup();
    const r = ok(applyStatusAction(day1, stops, lastLodging.id, "arrive", NOW));
    expect(r.updates[0]).toMatchObject({ status: "completed", started_at: iso("2026-12-31T09:30"), completed_at: iso("2026-12-31T09:30") });
  });

  it("a mid-day lodging is a normal stop", () => {
    const { stops, day1 } = setup();
    const checkIn = day1.find((s) => s.name.startsWith("ที่พักลำปาง (เช็กอิน"))!;
    expect(ok(applyStatusAction(day1, stops, checkIn.id, "arrive", NOW)).updates[0].status).toBe("in_progress");
  });

  it("asks before closing another in-progress stop, then closes it first", () => {
    const { stops, day1, temple, museum } = setup();
    const after = withUpdates(stops, ok(applyStatusAction(day1, stops, temple.id, "arrive", NOW)).updates);
    const day1b = seed.dayStops(1, after);

    const blocked = applyStatusAction(day1b, after, museum.id, "arrive", NOW + 3_600_000);
    expect(blocked).toMatchObject({ ok: false, reason: "other_in_progress", other: { id: temple.id } });

    const r = ok(applyStatusAction(day1b, after, museum.id, "arrive", NOW + 3_600_000, { closeOther: true }));
    expect(r.updates.map((s) => [s.id, s.status])).toEqual([
      [temple.id, "completed"],
      [museum.id, "in_progress"],
    ]);
    expect(r.updates[0].completed_at).toBe(iso("2026-12-31T10:30"));
  });

  it("complete → completed_at = now", () => {
    const { stops, day1, temple } = setup();
    const after = withUpdates(stops, ok(applyStatusAction(day1, stops, temple.id, "arrive", NOW)).updates);
    const r = ok(applyStatusAction(seed.dayStops(1, after), after, temple.id, "complete", NOW + 60_000));
    expect(r.updates[0]).toMatchObject({ status: "completed", completed_at: iso("2026-12-31T09:31"), started_at: iso("2026-12-31T09:30") });
  });

  it("skip flags the next stop's drive for review (D8)", () => {
    const { stops, day1, temple, museum } = setup();
    const r = ok(applyStatusAction(day1, stops, temple.id, "skip", NOW));
    expect(r.updates.map((s) => [s.id, s.status, s.travel_needs_review])).toEqual([
      [temple.id, "skipped", false],
      [museum.id, "not_started", true],
    ]);
  });

  it("skip on the last stop has no next stop to flag", () => {
    const { stops, day1, lastLodging } = setup();
    expect(ok(applyStatusAction(day1, stops, lastLodging.id, "skip", NOW)).updates).toHaveLength(1);
  });

  it("revert: completed → in_progress (clears completed_at)", () => {
    const { stops, temple } = setup();
    const done = { ...temple, status: "completed" as const, started_at: iso("2026-12-31T09:30"), completed_at: iso("2026-12-31T11:00") };
    const all = withUpdates(stops, [done]);
    const r = ok(applyStatusAction(seed.dayStops(1, all), all, temple.id, "revert", NOW));
    expect(r.updates[0]).toMatchObject({ status: "in_progress", started_at: iso("2026-12-31T09:30"), completed_at: null });
  });

  it.each(["in_progress", "skipped"] as const)("revert: %s → not_started (clears started_at)", (status) => {
    const { stops, temple } = setup();
    const all = withUpdates(stops, [{ ...temple, status, started_at: iso("2026-12-31T09:30") }]);
    const r = ok(applyStatusAction(seed.dayStops(1, all), all, temple.id, "revert", NOW));
    expect(r.updates[0]).toMatchObject({ status: "not_started", started_at: null, completed_at: null });
  });

  it("rejects invalid transitions, the origin and unknown stops", () => {
    const { stops, day1, temple } = setup();
    expect(() => applyStatusAction(day1, stops, temple.id, "complete", NOW)).toThrow();
    expect(() => applyStatusAction(day1, stops, temple.id, "revert", NOW)).toThrow();
    const done = withUpdates(stops, [{ ...temple, status: "completed" as const }]);
    expect(() => applyStatusAction(seed.dayStops(1, done), done, temple.id, "arrive", NOW)).toThrow();
    expect(() => applyStatusAction(seed.dayStops(1, done), done, temple.id, "skip", NOW)).toThrow();
    expect(() => applyStatusAction(day1, stops, day1[0].id, "arrive", NOW)).toThrow("origin");
    expect(() => applyStatusAction(day1, stops, "nope", "arrive", NOW)).toThrow();
  });
});

describe("availableActions", () => {
  const { temple } = setup();
  it.each([
    ["not_started", ["arrive", "skip"]],
    ["in_progress", ["complete", "skip", "revert"]],
    ["completed", ["revert"]],
    ["skipped", ["revert"]],
  ] as const)("%s → %j", (status, actions) => {
    expect(availableActions({ ...temple, status }, false)).toEqual(actions);
  });

  it("origin has none", () => {
    expect(availableActions(temple, true)).toEqual([]);
  });
});
