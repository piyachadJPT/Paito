import { describe, expect, it } from "vitest";
import { at, iso, loadSeed } from "@/test/seed";
import { delayedDeparture, overstayDeparture, shiftFrom, transitDeparture } from "./shift";
import { MINUTE } from "./types";

const seed = loadSeed();
const day1 = () => seed.dayStops(1);
const named = (stops: ReturnType<typeof day1>, prefix: string) => stops.find((s) => s.name.startsWith(prefix))!;

describe("shiftFrom", () => {
  it("before leaving the origin: +30 moves every unstarted stop until the fixed one", () => {
    const stops = day1();
    const origin = stops[0];
    const r = shiftFrom(stops, origin.id, delayedDeparture(origin, 30, 0));
    expect(r.preview.shiftMinutes).toBe(30);
    expect(named(r.stops, "วัดพระธาตุ").planned_arrival_at).toBe(iso("2026-12-31T09:50"));
    expect(named(r.stops, "ที่พักลำปาง (เช็กอิน").planned_departure_at).toBe(iso("2026-12-31T18:55"));
    const festival = named(r.stops, "Lampang Festival");
    expect(festival.planned_arrival_at).toBe(iso("2026-12-31T19:00")); // fixed never moves
    expect(r.preview.conflicts).toEqual([{ stopId: festival.id, lateMinutes: 10, name: festival.name }]);
    expect(r.preview.lastStop).toMatchObject({
      name: "ที่พักลำปาง",
      arrivalAt: at("2027-01-01T00:45"),
      previousArrivalAt: at("2027-01-01T00:45"),
    });
    // anchor first, then the recalculated rows; snapshot holds the originals
    expect(r.changed[0].id).toBe(origin.id);
    expect(r.snapshot.map((s) => s.id)).toEqual(r.changed.map((s) => s.id));
    expect(r.snapshot[0].planned_departure_at).toBe(iso("2026-12-31T08:00"));
  });

  it("rounds the new departure up to 5 minutes", () => {
    const stops = day1();
    const r = shiftFrom(stops, stops[0].id, at("2026-12-31T08:11") + 20_000);
    expect(r.stops[0].planned_departure_at).toBe(iso("2026-12-31T08:15"));
    expect(r.preview.shiftMinutes).toBe(15);
  });

  it("overstaying at a stop: leave at max(started + duration, now)", () => {
    const stops = day1();
    const temple = {
      ...named(stops, "วัดพระธาตุ"),
      status: "in_progress" as const,
      started_at: iso("2026-12-31T09:30"),
    };
    expect(overstayDeparture(temple, at("2026-12-31T10:40"))).toBe(at("2026-12-31T11:00"));
    expect(overstayDeparture(temple, at("2026-12-31T11:03"))).toBe(at("2026-12-31T11:03"));
    expect(overstayDeparture({ ...temple, started_at: null }, at("2026-12-31T10:00"))).toBe(at("2026-12-31T11:30"));

    const withTemple = stops.map((s) => (s.id === temple.id ? temple : s));
    const r = shiftFrom(withTemple, temple.id, overstayDeparture(temple, at("2026-12-31T11:03")));
    expect(named(r.stops, "วัดพระธาตุ").planned_departure_at).toBe(iso("2026-12-31T11:05"));
    expect(named(r.stops, "วัดพระธาตุ").duration_minutes).toBe(90); // not extended
    expect(named(r.stops, "พิพิธภัณฑ์").planned_arrival_at).toBe(iso("2026-12-31T11:35"));
    expect(r.preview.shiftMinutes).toBe(15);
  });

  it("+15 at a stop also extends duration_minutes", () => {
    const stops = day1();
    const temple = named(stops, "วัดพระธาตุ");
    const r = shiftFrom(stops, temple.id, delayedDeparture(temple, 15, 0), { extendDuration: true });
    expect(named(r.stops, "วัดพระธาตุ").duration_minutes).toBe(105);
    expect(named(r.stops, "วัดพระธาตุ").planned_departure_at).toBe(iso("2026-12-31T11:05"));
  });

  it("in transit and late: anchor on the stop we left, at completed_at ?? now", () => {
    const stops = day1();
    const temple = {
      ...named(stops, "วัดพระธาตุ"),
      status: "completed" as const,
      started_at: iso("2026-12-31T09:20"),
      completed_at: iso("2026-12-31T11:12"),
    };
    expect(transitDeparture(temple, at("2026-12-31T11:30"))).toBe(at("2026-12-31T11:12"));
    expect(transitDeparture(stops[0], at("2026-12-31T08:20"))).toBe(at("2026-12-31T08:20"));

    const withTemple = stops.map((s) => (s.id === temple.id ? temple : s));
    const r = shiftFrom(withTemple, temple.id, transitDeparture(temple, at("2026-12-31T11:30")));
    expect(named(r.stops, "พิพิธภัณฑ์").planned_arrival_at).toBe(iso("2026-12-31T11:45"));
  });

  it("only touches the given day", () => {
    const stops = day1();
    const r = shiftFrom(stops, stops[0].id, at("2026-12-31T09:00"));
    expect(r.stops.every((s) => s.trip_day_id === seed.dayId(1))).toBe(true);
  });

  it("no change → nothing to save", () => {
    const stops = day1();
    const r = shiftFrom(stops, stops[0].id, at("2026-12-31T08:00"));
    expect(r.changed).toEqual([]);
    expect(r.preview.shiftMinutes).toBe(0);
  });

  it("anchor without a planned departure, and a day of one stop", () => {
    const [origin] = day1();
    const lonely = { ...origin, planned_departure_at: null };
    const r = shiftFrom([lonely], lonely.id, at("2026-12-31T09:00"));
    expect(r.preview.lastStop).toBeNull();
    expect(r.preview.shiftMinutes).toBe(0);
    expect(r.changed).toHaveLength(1);
    expect(delayedDeparture(lonely, 10, at("2026-12-31T09:00"))).toBe(at("2026-12-31T09:00") + 10 * MINUTE);
  });

  it("throws for a stop outside the day", () => {
    expect(() => shiftFrom(day1(), "nope", 0)).toThrow();
  });
});
