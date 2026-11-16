import { describe, expect, it } from "vitest";
import { iso, loadSeed, makeStop } from "@/test/seed";
import { analyzeDay, recalculateDay } from "./recalculate";
import { ceilTo5Minutes, compareStops, daysBetween, getDayStops, toIso, toMs } from "./util";

const T0 = "2027-02-01T01:00:00.000Z"; // origin departure

function day(...rest: Parameters<typeof makeStop>[0][]) {
  const origin = makeStop({ stop_type: "lodging", travel_minutes: null, duration_minutes: 0, planned_departure_at: T0 });
  return [origin, ...rest.map((p) => makeStop(p))];
}

describe("recalculateDay", () => {
  it("chains arrival = previous departure + travel, departure = arrival + duration", () => {
    const stops = day({ travel_minutes: 30, duration_minutes: 60 }, { travel_minutes: 15, duration_minutes: 45 });
    const r = recalculateDay(stops, 0);
    expect(r.stops[1].planned_arrival_at).toBe("2027-02-01T01:30:00.000Z");
    expect(r.stops[1].planned_departure_at).toBe("2027-02-01T02:30:00.000Z");
    expect(r.stops[2].planned_arrival_at).toBe("2027-02-01T02:45:00.000Z");
    expect(r.stops[2].planned_departure_at).toBe("2027-02-01T03:30:00.000Z");
    expect(r.changed.map((s) => s.id)).toEqual([stops[1].id, stops[2].id]);
  });

  it("does not mutate its input", () => {
    const stops = day({});
    recalculateDay(stops, 0);
    expect(stops[1].planned_arrival_at).toBeNull();
  });

  it("reports nothing changed when times are already right", () => {
    const first = recalculateDay(day({}, {}), 0).stops;
    expect(recalculateDay(first, 0).changed).toEqual([]);
  });

  it("treats equal instants with different ISO offsets as unchanged", () => {
    const first = recalculateDay(day({ travel_minutes: 0, duration_minutes: 0 }), 0).stops;
    first[1].planned_arrival_at = "2027-02-01T08:00:00+07:00";
    expect(recalculateDay(first, 0).changed).toEqual([]);
  });

  it("fixed stop keeps its arrival and reports a gap when early", () => {
    const stops = day({ travel_minutes: 30, duration_minutes: 0 }, {
      is_fixed: true,
      planned_arrival_at: "2027-02-01T02:00:00.000Z",
      travel_minutes: 10,
      duration_minutes: 60,
    });
    const r = recalculateDay(stops, 0);
    expect(r.stops[2].planned_arrival_at).toBe("2027-02-01T02:00:00.000Z");
    expect(r.stops[2].planned_departure_at).toBe("2027-02-01T03:00:00.000Z");
    expect(r.gaps).toEqual([{ stopId: stops[2].id, minutes: 20 }]);
    expect(r.conflicts).toEqual([]);
  });

  it("fixed stop never moves and reports a conflict when late; later stops chain from the fixed time", () => {
    const stops = day(
      { travel_minutes: 90, duration_minutes: 0 },
      { is_fixed: true, planned_arrival_at: "2027-02-01T02:00:00.000Z", travel_minutes: 10, duration_minutes: 60 },
      { travel_minutes: 5, duration_minutes: 0 },
    );
    const r = recalculateDay(stops, 0);
    expect(r.stops[2].planned_arrival_at).toBe("2027-02-01T02:00:00.000Z");
    expect(r.conflicts).toEqual([{ stopId: stops[2].id, lateMinutes: 40 }]);
    expect(r.stops[3].planned_arrival_at).toBe("2027-02-01T03:05:00.000Z");
  });

  it("skips skipped stops and chains from the previous non-skipped one", () => {
    const stops = day({ travel_minutes: 30, duration_minutes: 60 }, { status: "skipped" }, { travel_minutes: 20, duration_minutes: 10 });
    const r = recalculateDay(stops, 0);
    expect(r.stops[2].planned_arrival_at).toBeNull(); // skipped: untouched
    expect(r.stops[3].planned_arrival_at).toBe("2027-02-01T02:50:00.000Z"); // 02:30 + 20
  });

  it.each(["completed", "in_progress"] as const)("never touches %s stops but chains from their plan", (status) => {
    const stops = day(
      { status, planned_arrival_at: "2027-02-01T05:00:00.000Z", planned_departure_at: "2027-02-01T06:00:00.000Z" },
      { travel_minutes: 10, duration_minutes: 10 },
    );
    const r = recalculateDay(stops, 0);
    expect(r.stops[1].planned_arrival_at).toBe("2027-02-01T05:00:00.000Z");
    expect(r.stops[2].planned_arrival_at).toBe("2027-02-01T06:10:00.000Z");
  });

  it("uses the plan, not actual completed_at", () => {
    const stops = day(
      {
        status: "completed",
        planned_departure_at: "2027-02-01T02:00:00.000Z",
        completed_at: "2027-02-01T03:00:00.000Z",
      },
      { travel_minutes: 10 },
    );
    expect(recalculateDay(stops, 0).stops[2].planned_arrival_at).toBe("2027-02-01T02:10:00.000Z");
  });

  it("travel_minutes null counts as 0 and is reported", () => {
    const stops = day({ travel_minutes: null, duration_minutes: 30 });
    const r = recalculateDay(stops, 0);
    expect(r.missingTravel).toEqual([stops[1].id]);
    expect(r.stops[1].planned_arrival_at).toBe(T0);
  });

  it("only recalculates after fromIndex", () => {
    const stops = day({ duration_minutes: 30 }, { duration_minutes: 30 });
    const r = recalculateDay(stops, 1);
    expect(r.stops[1].planned_arrival_at).toBeNull();
    expect(r.changed.map((s) => s.id)).toEqual([]); // stop 2 chains from stop 1 which has no departure
  });

  it("cannot chain when the origin has no departure", () => {
    const stops = day({});
    stops[0].planned_departure_at = null;
    expect(recalculateDay(stops, 0).changed).toEqual([]);
  });

  it("seed: วัดพระธาตุลำปางหลวง 90 → 120 min shifts the next stop 30 min; Festival stays 19:00 and is 10 min late", () => {
    const seed = loadSeed();
    const stops = seed.dayStops(1).map((s) => (s.name === "วัดพระธาตุลำปางหลวง" ? { ...s, duration_minutes: 120 } : s));
    const r = recalculateDay(stops, 0);
    const byName = (n: string) => r.stops.find((s) => s.name.startsWith(n))!;
    expect(byName("พิพิธภัณฑ์เซรามิคธนบดี").planned_arrival_at).toBe(iso("2026-12-31T11:50"));
    const festival = byName("Lampang Festival");
    expect(festival.planned_arrival_at).toBe(iso("2026-12-31T19:00"));
    expect(r.conflicts).toEqual([{ stopId: festival.id, lateMinutes: 10 }]);
    expect(byName("ที่พักลำปาง").planned_arrival_at).toBe(iso("2026-12-31T14:55"));
    // the last lodging (after the fixed festival) does not move
    expect(r.stops[r.stops.length - 1].planned_arrival_at).toBe(iso("2027-01-01T00:45"));
  });

  it("analyzeDay = recalculate from the origin", () => {
    const seed = loadSeed();
    expect(analyzeDay(seed.dayStops(2)).changed).toEqual([]);
  });
});

describe("util", () => {
  it("ceilTo5Minutes", () => {
    expect(toIso(ceilTo5Minutes(Date.parse("2027-01-01T03:51:10Z")))).toBe("2027-01-01T03:55:00.000Z");
    expect(toIso(ceilTo5Minutes(Date.parse("2027-01-01T03:50:00Z")))).toBe("2027-01-01T03:50:00.000Z");
  });

  it("toMs handles null and rejects garbage", () => {
    expect(toMs(null)).toBeNull();
    expect(toMs(undefined)).toBeNull();
    expect(() => toMs("nope")).toThrow(RangeError);
  });

  it("orders by sort_order then created_at", () => {
    const a = makeStop({ sort_order: 1, created_at: "2027-01-02" });
    const b = makeStop({ sort_order: 1, created_at: "2027-01-01" });
    const c = makeStop({ sort_order: 0.5 });
    expect([a, b, c].sort(compareStops)).toEqual([c, b, a]);
    expect(compareStops(a, { ...a })).toBe(0);
    expect(getDayStops([a, b, c], "other")).toEqual([]);
  });

  it("daysBetween", () => {
    expect(daysBetween("2026-11-20", "2026-12-31")).toBe(41);
    expect(daysBetween("2027-01-01", "2026-12-31")).toBe(-1);
  });
});
