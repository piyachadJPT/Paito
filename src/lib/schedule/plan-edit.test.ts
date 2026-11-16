import { describe, expect, it } from "vitest";
import { iso, loadSeed, makeStop, withUpdates } from "@/test/seed";
import { canMove, defaultInsertIndex, editStop, insertStop, moveStop, moveStopToDay, removeStop, type PlanChange } from "./plan-edit";
import type { ScheduleStop } from "./types";
import { getDayStops } from "./util";

const seed = loadSeed();
const day = (n: number, stops = seed.stops) => seed.dayStops(n, stops);
const TEMPLE = "วัดพระธาตุลำปางหลวง";
const MUSEUM = "พิพิธภัณฑ์เซรามิคธนบดี";
const SRI = "วัดศรีรองเมือง";

/** Apply a change to the whole trip's stops (as the repo would) */
function apply<T extends ScheduleStop>(stops: readonly T[], change: PlanChange<T>): T[] {
  return [...withUpdates(stops, change.upserts), ...change.upserts.filter((u) => !stops.some((s) => s.id === u.id))].filter(
    (s) => !change.deletes.includes(s.id),
  );
}

function undo<T extends ScheduleStop>(stops: readonly T[], change: PlanChange<T>): T[] {
  return apply(stops, { ...change, upserts: change.undo.upserts, deletes: change.undo.deletes });
}

describe("editStop", () => {
  it("step 6 criterion: วัดพระธาตุฯ 90 → 120 min shifts the next stop 30 min; Festival stays 19:00 with a 10-min conflict", () => {
    const d1 = day(1);
    const temple = d1.find((s) => s.name === TEMPLE)!;
    const change = editStop(d1, { ...temple, duration_minutes: 120 });

    const after = getDayStops(apply(seed.stops, change), seed.dayId(1));
    expect(after.find((s) => s.name === MUSEUM)!.planned_arrival_at).toBe(iso("2026-12-31T11:50"));
    const festival = after.find((s) => s.name.startsWith("Lampang Festival"))!;
    expect(festival.planned_arrival_at).toBe(iso("2026-12-31T19:00"));
    expect(change.conflicts).toEqual([{ stopId: festival.id, lateMinutes: 10 }]);
    expect(change.gaps).toEqual([]);
    // only rows that changed are saved: temple + 4 stops before the fixed festival
    expect(change.upserts.map((s) => s.name)).toEqual([TEMPLE, MUSEUM, SRI, "สะพานรัษฎาภิเศก", "ที่พักลำปาง (เช็กอิน + พักก่อนงานกลางคืน)"]);
  });

  it("undo restores every touched row exactly", () => {
    const d1 = day(1);
    const temple = d1.find((s) => s.name === TEMPLE)!;
    const change = editStop(d1, { ...temple, duration_minutes: 120 });
    expect(undo(apply(seed.stops, change), change)).toEqual(seed.stops);
  });

  it("a stop in progress: new duration moves its own departure and the stops after it", () => {
    const d1 = day(1).map((s) => (s.name === TEMPLE ? { ...s, status: "in_progress" as const, started_at: iso("2026-12-31T09:30") } : s));
    const temple = d1.find((s) => s.name === TEMPLE)!;
    const change = editStop(d1, { ...temple, duration_minutes: 120 });
    expect(change.upserts[0]).toMatchObject({ planned_arrival_at: iso("2026-12-31T09:20"), planned_departure_at: iso("2026-12-31T11:20") });
    expect(change.upserts.find((s) => s.name === MUSEUM)!.planned_arrival_at).toBe(iso("2026-12-31T11:50"));
  });

  it("changing travel time clears the review flag", () => {
    const d1 = day(1).map((s) => (s.name === MUSEUM ? { ...s, travel_needs_review: true } : s));
    const museum = d1.find((s) => s.name === MUSEUM)!;
    expect(editStop(d1, { ...museum, travel_minutes: 35 }).upserts[0].travel_needs_review).toBe(false);
    expect(editStop(d1, { ...museum, note: "x" }).upserts[0].travel_needs_review).toBe(true);
  });

  it("origin departure change moves the day; origin keeps no travel/duration", () => {
    const d1 = day(1);
    const change = editStop(d1, { ...d1[0], planned_departure_at: iso("2026-12-31T08:30"), duration_minutes: 99, travel_minutes: 5 });
    const origin = change.upserts[0];
    expect(origin).toMatchObject({ duration_minutes: 0, travel_minutes: null, planned_departure_at: iso("2026-12-31T08:30") });
    expect(change.upserts.find((s) => s.name === TEMPLE)!.planned_arrival_at).toBe(iso("2026-12-31T09:50"));
  });

  it("locking a time fixes the arrival; unlocking returns it to the chain", () => {
    const d1 = day(1);
    const sri = d1.find((s) => s.name === SRI)!;
    const locked = editStop(d1, { ...sri, is_fixed: true, planned_arrival_at: iso("2026-12-31T13:30") });
    expect(locked.gaps).toEqual([{ stopId: sri.id, minutes: 40 }]);
    const lockedDay = getDayStops(apply(seed.stops, locked), seed.dayId(1));
    const unlocked = editStop(lockedDay, { ...lockedDay.find((s) => s.id === sri.id)!, is_fixed: false });
    expect(unlocked.upserts.find((s) => s.id === sri.id)!.planned_arrival_at).toBe(iso("2026-12-31T12:50"));
  });
});

describe("insertStop", () => {
  it("goes before tonight's lodging by default, with travel not filled in", () => {
    const d2 = day(2);
    expect(defaultInsertIndex(d2)).toBe(d2.length - 1);
    const fresh = makeStop({ trip_day_id: seed.dayId(2), name: "ร้านข้าวซอย", travel_minutes: null, duration_minutes: 60, stop_type: "food" });
    const change = insertStop(d2, fresh);
    const after = getDayStops(apply(seed.stops, change), seed.dayId(2));
    const i = after.findIndex((s) => s.id === fresh.id);
    expect(i).toBe(after.length - 2);
    expect(after[i].sort_order).toBeGreaterThan(after[i - 1].sort_order);
    expect(after[i].sort_order).toBeLessThan(after[i + 1].sort_order);
    expect(after[i].travel_needs_review).toBe(false); // new: "ยังไม่กรอกเวลาขับ" instead
    expect(after[i + 1].travel_needs_review).toBe(true); // lodging now comes after a new stop
    expect(after[i].planned_arrival_at).toBe(iso("2027-01-01T19:45")); // travel null → 0
    expect(change.undo.deletes).toEqual([fresh.id]);
  });

  it("appends when the day does not end at a lodging; never before the origin", () => {
    const short = [makeStop({ stop_type: "lodging", planned_departure_at: iso("2027-01-01T08:00"), sort_order: 0 }), makeStop({ sort_order: 1000 })];
    expect(defaultInsertIndex(short)).toBe(2);
    expect(defaultInsertIndex([short[0]])).toBe(1);
    const change = insertStop(short, makeStop({ sort_order: -1 }), 0);
    expect(change.upserts.find((s) => s.sort_order === 500)).toBeDefined(); // clamped to index 1
  });
});

describe("removeStop", () => {
  it("deletes, flags the next stop and recalculates; undo brings it back", () => {
    const d1 = day(1);
    const temple = d1.find((s) => s.name === TEMPLE)!;
    const change = removeStop(d1, temple.id);
    expect(change.deletes).toEqual([temple.id]);
    const museum = change.upserts.find((s) => s.name === MUSEUM)!;
    expect(museum.travel_needs_review).toBe(true);
    expect(museum.planned_arrival_at).toBe(iso("2026-12-31T08:30"));
    expect(undo(apply(seed.stops, change), change).sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...seed.stops].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it("refuses the origin", () => {
    expect(() => removeStop(day(1), day(1)[0].id)).toThrow();
  });
});

describe("moveStop", () => {
  it("step 6 criterion: swapping order shows 'ตรวจเวลาขับ' on stops whose previous stop changed", () => {
    const d1 = day(1);
    const museum = d1.find((s) => s.name === MUSEUM)!;
    const change = moveStop(d1, museum.id, -1);
    const after = getDayStops(apply(seed.stops, change), seed.dayId(1));
    expect(after.slice(1, 4).map((s) => [s.name, s.travel_needs_review])).toEqual([
      [MUSEUM, true],
      [TEMPLE, true],
      [SRI, true],
    ]);
    expect(after[4].travel_needs_review).toBe(false);
  });

  it("cannot move the origin or above it, nor past the end", () => {
    const d1 = day(1);
    expect(canMove(d1, d1[0].id, 1)).toBe(false);
    expect(canMove(d1, d1[1].id, -1)).toBe(false);
    expect(canMove(d1, d1[d1.length - 1].id, 1)).toBe(false);
    expect(canMove(d1, d1[2].id, -1)).toBe(true);
    expect(() => moveStop(d1, d1[1].id, -1)).toThrow();
  });

  it("renumbers when sort_orders are tied", () => {
    const tied = [
      makeStop({ stop_type: "lodging", sort_order: 0, planned_departure_at: iso("2027-01-01T08:00") }),
      makeStop({ sort_order: 1000, created_at: "2026-01-01" }),
      makeStop({ sort_order: 1000, created_at: "2026-01-02" }),
    ];
    const change = moveStop(tied, tied[2].id, -1);
    const order = [...tied.map((s) => change.upserts.find((u) => u.id === s.id) ?? s)].sort((a, b) => a.sort_order - b.sort_order);
    expect(order.map((s) => s.id)).toEqual([tied[0].id, tied[2].id, tied[1].id]);
  });
});

describe("moveStopToDay", () => {
  it("places the stop before the target day's last lodging and recalculates both days", () => {
    const d1 = day(1);
    const d2 = day(2);
    const sri = d1.find((s) => s.name === SRI)!;
    const change = moveStopToDay(d1, d2, sri.id, seed.dayId(2));
    const all = apply(seed.stops, change);
    const after1 = getDayStops(all, seed.dayId(1));
    const after2 = getDayStops(all, seed.dayId(2));

    expect(after1.some((s) => s.id === sri.id)).toBe(false);
    expect(after1.find((s) => s.name === "สะพานรัษฎาภิเศก")!.travel_needs_review).toBe(true);
    expect(after2[after2.length - 2].id).toBe(sri.id);
    expect(after2[after2.length - 2].travel_needs_review).toBe(true);
    expect(after2[after2.length - 1].travel_needs_review).toBe(true);
    expect(after2[after2.length - 2].planned_arrival_at).toBe(iso("2027-01-01T20:00")); // 19:45 + 15
    expect(undo(all, change).sort((a, b) => a.id.localeCompare(b.id))).toEqual([...seed.stops].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it("refuses the origin and an empty target", () => {
    expect(() => moveStopToDay(day(1), day(2), day(1)[0].id, seed.dayId(2))).toThrow();
    expect(() => moveStopToDay(day(1), [], day(1)[1].id, "x")).toThrow();
  });
});
