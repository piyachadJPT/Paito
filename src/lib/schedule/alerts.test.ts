import { describe, expect, it } from "vitest";
import { alertKey, computeDueAlerts, type AlertInput } from "./alerts";
import { computeProgress, sumProgress } from "./progress";
import { MINUTE } from "./types";
import { makeStop } from "@/test/seed";

const DEP = Date.parse("2027-01-01T03:50:00Z");
const input = (over: Partial<AlertInput> = {}): AlertInput => ({
  state: "at_stop",
  stopId: "s",
  stopName: "วัด",
  nextName: "พิพิธภัณฑ์",
  departureAt: DEP,
  activityEnd: DEP + 10 * MINUTE,
  alertMinutes: 15,
  ...over,
});

describe("computeDueAlerts", () => {
  it("nothing before the warning window", () => {
    expect(computeDueAlerts(input(), DEP - 16 * MINUTE)).toEqual([]);
  });

  it("departure_soon inside the window with live minutes", () => {
    const [a] = computeDueAlerts(input(), DEP - 15 * MINUTE);
    expect(a).toMatchObject({ kind: "departure_soon", message: "อีก 15 นาทีต้องออกไป พิพิธภัณฑ์", targetAt: DEP });
    expect(computeDueAlerts(input(), DEP - 30_000)[0].message).toBe("อีกไม่ถึง 1 นาทีต้องออกไป พิพิธภัณฑ์");
  });

  it("departure_now at the time, then 'เลยเวลาออกมา' once missed", () => {
    expect(computeDueAlerts(input(), DEP)[0]).toMatchObject({ kind: "departure_now", message: "ถึงเวลาออกไป พิพิธภัณฑ์ แล้ว" });
    expect(computeDueAlerts(input(), DEP + 7 * MINUTE)[0].message).toBe("เลยเวลาออกมา 7 นาที · ต่อไป พิพิธภัณฑ์");
    expect(computeDueAlerts(input(), DEP + 75 * MINUTE)[0].kind).toBe("activity_end");
  });

  it("activity_end when the visit time is up, latest alert wins", () => {
    const [a] = computeDueAlerts(input(), DEP + 10 * MINUTE);
    expect(a).toMatchObject({ kind: "activity_end", message: "ครบเวลาเที่ยวที่ วัด แล้ว" });
    expect(computeDueAlerts(input(), DEP + 13 * MINUTE)[0].message).toBe("ครบเวลาเที่ยวที่ วัด แล้ว (เลยมา 3 นาที)");
  });

  it("works without a next stop", () => {
    const noNext = input({ nextName: null, activityEnd: null });
    expect(computeDueAlerts(noNext, DEP - 5 * MINUTE)[0].message).toBe("อีก 5 นาทีต้องออก");
    expect(computeDueAlerts(noNext, DEP)[0].message).toBe("ถึงเวลาออกแล้ว");
    expect(computeDueAlerts(noNext, DEP + 2 * MINUTE)[0].message).toBe("เลยเวลาออกมา 2 นาที");
  });

  it("alertMinutes 0 disables the early warning only", () => {
    expect(computeDueAlerts(input({ alertMinutes: 0 }), DEP - MINUTE)).toEqual([]);
    expect(computeDueAlerts(input({ alertMinutes: 0 }), DEP)).toHaveLength(1);
  });

  it("pre_departure never raises activity_end; missing departure raises nothing", () => {
    expect(computeDueAlerts(input({ state: "pre_departure", departureAt: null }), DEP + 60 * MINUTE)).toEqual([]);
    expect(computeDueAlerts(null, DEP)).toEqual([]);
  });

  it("dismissed by key; key changes with the target time", () => {
    const [a] = computeDueAlerts(input(), DEP);
    expect(a.key).toBe(alertKey("departure_now", "s", DEP));
    expect(computeDueAlerts(input(), DEP, new Set([a.key]))).toEqual([]);
    const later = DEP + 5 * MINUTE;
    expect(computeDueAlerts(input({ departureAt: later, activityEnd: null }), later, new Set([a.key]))).toHaveLength(1);
  });
});

describe("computeProgress", () => {
  it("counts sight + food only; skipped separately", () => {
    const p = computeProgress([
      makeStop({ stop_type: "lodging", status: "completed" }),
      makeStop({ stop_type: "rest", status: "completed" }),
      makeStop({ stop_type: "sight", status: "completed" }),
      makeStop({ stop_type: "food", status: "skipped" }),
      makeStop({ stop_type: "sight" }),
    ]);
    expect(p).toEqual({ total: 3, done: 1, skipped: 1 });
    expect(sumProgress([p, p])).toEqual({ total: 6, done: 2, skipped: 2 });
  });
});
