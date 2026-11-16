import { describe, expect, it } from "vitest";
import type { ImportedStop } from "@/lib/import/import-schema";
import { at, iso, loadSeed, withUpdates } from "@/test/seed";
import { formatDuration } from "./format";
import { getNowState, leaveOnPlanKey, type NowState } from "./now-state";
import { getServiceDate } from "./service-day";
import { applyStatusAction } from "./status";
import { MINUTE } from "./types";

const seed = loadSeed();

function stateAt(local: string, stops: ImportedStop[] = seed.stops, options = {}) {
  return getNowState(seed.trip, seed.days, stops, at(local), options);
}

function expectKind<K extends NowState["kind"]>(s: NowState<ImportedStop>, kind: K) {
  expect(s.kind).toBe(kind);
  return s as Extract<NowState<ImportedStop>, { kind: K }>;
}

/** Press a status button at a trip-local time. */
function press(stops: ImportedStop[], dayNumber: number, name: string, action: "arrive" | "complete" | "skip", local: string) {
  const day = seed.dayStops(dayNumber, stops);
  const stop = day.find((s) => s.name === name)!;
  const r = applyStatusAction(day, stops, stop.id, action, at(local), { closeOther: true });
  if (!r.ok) throw new Error("blocked");
  return withUpdates(stops, r.updates);
}

const TEMPLE = "วัดพระธาตุลำปางหลวง";
const MUSEUM = "พิพิธภัณฑ์เซรามิคธนบดี";

describe("getServiceDate (cut off at 04:00)", () => {
  it.each([
    ["2026-12-31T23:59", "2026-12-31"],
    ["2027-01-01T00:30", "2026-12-31"],
    ["2027-01-01T03:59", "2026-12-31"],
    ["2027-01-01T04:00", "2027-01-01"],
  ])("%s → %s", (local, date) => {
    expect(getServiceDate(at(local), "Asia/Bangkok", 4)).toBe(date);
  });

  it("cutoff 0 is plain midnight", () => {
    expect(getServiceDate(at("2027-01-01T00:30"), "Asia/Bangkok", 0)).toBe("2027-01-01");
  });
});

describe("getNowState — step 7 acceptance scenarios (seed + simulated clock)", () => {
  it("2026-11-20 10:00 → before_trip, 41 days", () => {
    const s = expectKind(stateAt("2026-11-20T10:00"), "before_trip");
    expect(s.daysUntil).toBe(41);
    expect(s.firstOrigin?.name).toBe("บ้าน (ลำพูน)");
    expect(s.firstDepartureAt).toBe(at("2026-12-31T08:00"));
    expect(s.day).toBeNull();
    expect(s.progress).toBeNull();
    expect(s.alerts).toEqual([]);
  });

  it("2026-12-31 07:50 → pre_departure, leave in 10 minutes, with a departure alert", () => {
    const s = expectKind(stateAt("2026-12-31T07:50"), "pre_departure");
    expect(s.origin.name).toBe("บ้าน (ลำพูน)");
    expect(s.next?.name).toBe(TEMPLE);
    expect(s.departureLeft).toBe(10 * MINUTE);
    expect(formatDuration(s.departureLeft!)).toBe("10 นาที");
    expect(s.alerts).toHaveLength(1);
    expect(s.alerts[0]).toMatchObject({ kind: "departure_soon", message: `อีก 10 นาทีต้องออกไป ${TEMPLE}` });
  });

  it("07:40 → pre_departure without alert (more than 15 minutes)", () => {
    expect(stateAt("2026-12-31T07:40").alerts).toEqual([]);
  });

  it("08:30 → in_transit to the temple, ETA 09:20, on time", () => {
    const s = expectKind(stateAt("2026-12-31T08:30"), "in_transit");
    expect(s.from.name).toBe("บ้าน (ลำพูน)");
    expect(s.next.name).toBe(TEMPLE);
    expect(s.eta).toBe(at("2026-12-31T09:20"));
    expect(s.lateBy).toBe(0);
    expect(s.probablyArrived).toBe(false);
    expect(s.alerts).toEqual([]); // never alert while driving
  });

  it("09:25 still in transit → probably arrived", () => {
    expect(expectKind(stateAt("2026-12-31T09:25"), "in_transit").probablyArrived).toBe(true);
  });

  it("09:30 press 'ถึงแล้ว' → at_stop: leave 10:50, 1 ชม. 30 นาที of visit left, 10 min late", () => {
    const stops = press(seed.stops, 1, TEMPLE, "arrive", "2026-12-31T09:30");
    const s = expectKind(stateAt("2026-12-31T09:30", stops), "at_stop");
    expect(s.current.name).toBe(TEMPLE);
    expect(s.next?.name).toBe(MUSEUM);
    expect(s.departureAt).toBe(at("2026-12-31T10:50"));
    expect(formatDuration(s.departureLeft!)).toBe("1 ชม. 20 นาที");
    expect(formatDuration(s.activityLeft)).toBe("1 ชม. 30 นาที");
    expect(s.lateBy).toBe(10 * MINUTE);
    expect(s.suggestedShiftMinutes).toBe(10);
    expect(s.alerts).toEqual([]);
  });

  it("10:36 → alert 'อีก 14 นาทีต้องออก…'", () => {
    const stops = press(seed.stops, 1, TEMPLE, "arrive", "2026-12-31T09:30");
    const s = stateAt("2026-12-31T10:36", stops);
    expect(s.alerts).toHaveLength(1);
    expect(s.alerts[0].message).toBe(`อีก 14 นาทีต้องออกไป ${MUSEUM}`);
  });

  it("all of Day 1 done → day_done, tomorrow 09:30 from ที่พักลำปาง", () => {
    let stops = seed.stops;
    for (const s of seed.dayStops(1).slice(1)) {
      stops = press(stops, 1, s.name, "arrive", "2026-12-31T20:00");
      if (stops.find((x) => x.id === s.id)!.status === "in_progress") {
        stops = press(stops, 1, s.name, "complete", "2026-12-31T20:00");
      }
    }
    const s = expectKind(stateAt("2027-01-01T00:50", stops), "day_done");
    expect(s.day?.day_number).toBe(1);
    expect(s.lodging?.name).toBe("ที่พักลำปาง");
    expect(s.nextOrigin?.name).toBe("ที่พักลำปาง");
    expect(s.nextDepartureAt).toBe(at("2027-01-01T09:30"));
    expect(s.progress).toEqual({ total: 5, done: 5, skipped: 0 });
  });

  it("2027-01-04 10:00 → after_trip with a summary", () => {
    const s = expectKind(stateAt("2027-01-04T10:00"), "after_trip");
    expect(s.summary).toEqual({ total: 14, done: 0, skipped: 0 });
  });
});

describe("getNowState — day selection", () => {
  it("2027-01-01 00:30 is still Day 1 (AC-06)", () => {
    const s = stateAt("2027-01-01T00:30");
    expect(s.serviceDate).toBe("2026-12-31");
    expect(s.day?.day_number).toBe(1);
  });

  it("04:00 switches to Day 2 (pre_departure)", () => {
    const s = expectKind(stateAt("2027-01-01T04:00"), "pre_departure");
    expect(s.day?.day_number).toBe(2);
    expect(s.departureAt).toBe(at("2027-01-01T09:30"));
  });

  it("an in-progress stop wins over the date and is flagged stale (D9)", () => {
    const stops = press(seed.stops, 1, "Lampang Festival — สวนสาธารณะหนองกระทิง", "arrive", "2026-12-31T19:00");
    const s = expectKind(stateAt("2027-01-01T05:00", stops), "at_stop");
    expect(s.day?.day_number).toBe(1);
    expect(s.staleInProgress?.name).toContain("Lampang Festival");
    expect(stateAt("2026-12-31T23:00", stops).staleInProgress).toBeNull();
  });

  it("the in-progress day wins even after the trip ended", () => {
    const stops = press(seed.stops, 4, "วัดห้วยปลากั้ง", "arrive", "2027-01-03T09:00");
    expect(stateAt("2027-01-05T10:00", stops).kind).toBe("at_stop");
  });
});

describe("getNowState — at_stop details", () => {
  const arrived = () => press(seed.stops, 1, TEMPLE, "arrive", "2026-12-31T09:30");

  it("'ออกตามแผน' switches the activity countdown to the departure", () => {
    const stops = arrived();
    const temple = stops.find((s) => s.name === TEMPLE)!;
    const s = expectKind(
      stateAt("2026-12-31T10:00", stops, { leaveOnPlan: new Set([leaveOnPlanKey(temple)]) }),
      "at_stop",
    );
    expect(s.leavingOnPlan).toBe(true);
    expect(s.activityTarget).toBe(at("2026-12-31T10:50"));
    expect(s.activityLeft).toBe(50 * MINUTE);
  });

  it("past the departure → negative departureLeft and a 'เลยเวลาออก' alert", () => {
    const s = expectKind(stateAt("2026-12-31T10:57", arrived()), "at_stop");
    expect(s.departureLeft).toBe(-7 * MINUTE);
    expect(formatDuration(s.departureLeft!)).toBe("เกินมา 7 นาที");
    expect(s.alerts[0]).toMatchObject({ kind: "departure_now", message: `เลยเวลาออกมา 7 นาที · ต่อไป ${MUSEUM}` });
    expect(s.suggestedShiftMinutes).toBe(10);
  });

  it("overstaying past the activity end → suggested shift follows now, rounded to 5", () => {
    const s = expectKind(stateAt("2026-12-31T11:03", arrived()), "at_stop");
    expect(s.suggestedShiftMinutes).toBe(15); // 11:05 − 10:50
    expect(s.alerts[0].kind).toBe("activity_end"); // latest due alert wins (D5)
  });

  it("no next stop when the rest is done", () => {
    let stops = seed.stops;
    for (const name of ["วัดห้วยปลากั้ง"]) stops = press(stops, 4, name, "arrive", "2027-01-03T09:00");
    stops = press(stops, 4, "บ้าน (ลำพูน)", "skip", "2027-01-03T09:00");
    const s = expectKind(stateAt("2027-01-03T09:10", stops), "at_stop");
    expect(s.next).toBeNull();
  });
});

describe("getNowState — in_transit details", () => {
  it("from the last completed stop, using its completed_at", () => {
    let stops = press(seed.stops, 1, TEMPLE, "arrive", "2026-12-31T09:20");
    stops = press(stops, 1, TEMPLE, "complete", "2026-12-31T11:10");
    const s = expectKind(stateAt("2026-12-31T11:15", stops), "in_transit");
    expect(s.from.name).toBe(TEMPLE);
    expect(s.next.name).toBe(MUSEUM);
    expect(s.eta).toBe(at("2026-12-31T11:40"));
    expect(s.lateBy).toBe(20 * MINUTE);
  });

  it("skipped stops are passed over", () => {
    const stops = press(seed.stops, 1, TEMPLE, "skip", "2026-12-31T08:30");
    const s = expectKind(stateAt("2026-12-31T08:40", stops), "in_transit");
    expect(s.next.name).toBe(MUSEUM);
    expect(s.progress).toEqual({ total: 5, done: 0, skipped: 1 });
  });

  it("missing planned times give null eta/lateBy", () => {
    const stops = seed.stops.map((s) =>
      s.name === TEMPLE ? { ...s, planned_arrival_at: null } : s,
    );
    expect(expectKind(stateAt("2026-12-31T08:30", stops), "in_transit").lateBy).toBeNull();
  });
});

describe("getNowState — edge cases", () => {
  it("a day with only the origin is done", () => {
    const stops = seed.stops.filter((s) => s.trip_day_id !== seed.dayId(4) || s.sort_order === 0);
    expect(stateAt("2027-01-03T08:00", stops).kind).toBe("day_done");
  });

  it("an origin without a departure stays in pre_departure", () => {
    const stops = seed.stops.map((s) => (s.trip_day_id === seed.dayId(2) && s.sort_order === 0 ? { ...s, planned_departure_at: null } : s));
    const s = expectKind(stateAt("2027-01-01T12:00", stops), "pre_departure");
    expect(s.departureAt).toBeNull();
    expect(s.departureLeft).toBeNull();
  });

  it("the last day's day_done has no next day", () => {
    let stops = seed.stops;
    stops = press(stops, 4, "วัดห้วยปลากั้ง", "skip", "2027-01-03T09:00");
    stops = press(stops, 4, "บ้าน (ลำพูน)", "arrive", "2027-01-03T13:00");
    const s = expectKind(stateAt("2027-01-03T13:10", stops), "day_done");
    expect(s.nextDay).toBeNull();
    expect(s.nextDepartureAt).toBeNull();
    expect(s.lodging?.name).toBe("บ้าน (ลำพูน)");
  });

  it("no days at all → before_trip counting to the trip start", () => {
    const s = expectKind(getNowState(seed.trip, [], [], at("2026-12-30T10:00")), "before_trip");
    expect(s.daysUntil).toBe(1);
    expect(s.firstOrigin).toBeNull();
  });

  it("a date between days falls back to the latest earlier day", () => {
    const days = seed.days.filter((d) => d.day_number !== 2);
    expect(getNowState(seed.trip, days, seed.stops, at("2027-01-01T12:00")).day?.day_number).toBe(1);
  });

  it("dismissed alerts stay hidden; a new target time alerts again", () => {
    const first = stateAt("2026-12-31T07:50");
    const dismissed = new Set([first.alerts[0].key]);
    expect(stateAt("2026-12-31T07:55", seed.stops, { dismissedAlerts: dismissed }).alerts).toEqual([]);

    const moved = seed.stops.map((s) => (s.id === seed.dayStops(1)[0].id ? { ...s, planned_departure_at: iso("2026-12-31T08:05") } : s));
    expect(stateAt("2026-12-31T07:55", moved, { dismissedAlerts: dismissed }).alerts).toHaveLength(1);
  });
});
