import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE,
  formatCalendarDate,
  formatCalendarDayMonth,
  formatDate,
  formatDayMonth,
  formatTime,
  getZonedParts,
  toDateKey,
  zonedLocalToUtc,
} from ".";

const BKK = DEFAULT_TIMEZONE;

describe("machine timezone guard", () => {
  it("tests run outside Bangkok and UTC", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
  });
});

describe("formatTime", () => {
  it("formats 24h with น. in the trip timezone", () => {
    expect(formatTime("2027-01-01T06:30:00Z", BKK)).toBe("13:30 น.");
  });

  it("pads single-digit hours", () => {
    expect(formatTime("2026-12-31T01:05:00Z", BKK)).toBe("08:05 น.");
  });

  it("shows 00:30 after midnight, not 24:30", () => {
    expect(formatTime("2026-12-31T17:30:00Z", BKK)).toBe("00:30 น.");
  });

  it("accepts Date and epoch ms", () => {
    const d = new Date("2027-01-01T06:30:00Z");
    expect(formatTime(d, BKK)).toBe("13:30 น.");
    expect(formatTime(d.getTime(), BKK)).toBe("13:30 น.");
  });

  it("rejects invalid input", () => {
    expect(() => formatTime("nope", BKK)).toThrow(RangeError);
  });
});

describe("formatDate", () => {
  it("formats Thai short weekday, month and Buddhist year", () => {
    expect(formatDate("2027-01-01T05:00:00Z", BKK)).toBe("ศ. 1 ม.ค. 2570");
  });

  it("uses the trip timezone across midnight", () => {
    // 17:30Z on 31 Dec is 00:30 on 1 Jan in Bangkok
    expect(formatDate("2026-12-31T17:30:00Z", BKK)).toBe("ศ. 1 ม.ค. 2570");
    expect(formatDate("2026-12-31T16:59:00Z", BKK)).toBe("พฤ. 31 ธ.ค. 2569");
  });

  it("formats day and month only", () => {
    expect(formatDayMonth("2026-12-31T05:00:00Z", BKK)).toBe("31 ธ.ค.");
  });
});

describe("calendar dates", () => {
  it("formats a date key independent of timezone", () => {
    expect(formatCalendarDate("2027-01-01")).toBe("ศ. 1 ม.ค. 2570");
    expect(formatCalendarDate("2026-12-31")).toBe("พฤ. 31 ธ.ค. 2569");
    expect(formatCalendarDayMonth("2027-01-03")).toBe("3 ม.ค.");
  });

  it("rejects malformed keys", () => {
    expect(() => formatCalendarDate("2027-1-1")).toThrow(RangeError);
  });
});

describe("getZonedParts / toDateKey", () => {
  it("returns wall-clock fields in the given zone", () => {
    expect(getZonedParts("2026-12-31T17:30:45Z", BKK)).toEqual({
      year: 2027, month: 1, day: 1, hour: 0, minute: 30, second: 45,
    });
  });

  it("returns a Gregorian date key", () => {
    expect(toDateKey("2026-12-31T17:30:00Z", BKK)).toBe("2027-01-01");
    expect(toDateKey("2026-12-31T16:59:59Z", BKK)).toBe("2026-12-31");
  });
});

describe("zonedLocalToUtc", () => {
  it("converts Bangkok wall time (+07:00)", () => {
    expect(zonedLocalToUtc("2026-12-31T08:00", BKK).toISOString()).toBe("2026-12-31T01:00:00.000Z");
    expect(zonedLocalToUtc("2027-01-01T00:30", BKK).toISOString()).toBe("2026-12-31T17:30:00.000Z");
  });

  it("accepts seconds", () => {
    expect(zonedLocalToUtc("2026-12-31T08:00:30", BKK).toISOString()).toBe("2026-12-31T01:00:30.000Z");
  });

  it("round-trips with getZonedParts", () => {
    const d = zonedLocalToUtc("2027-01-02T07:30", BKK);
    expect(formatTime(d, BKK)).toBe("07:30 น.");
    expect(toDateKey(d, BKK)).toBe("2027-01-02");
  });

  it("handles a zone with DST (winter and summer)", () => {
    const NY = "America/New_York";
    expect(zonedLocalToUtc("2027-01-15T09:00", NY).toISOString()).toBe("2027-01-15T14:00:00.000Z");
    expect(zonedLocalToUtc("2027-07-15T09:00", NY).toISOString()).toBe("2027-07-15T13:00:00.000Z");
  });

  it("resolves a time inside a DST gap to just after the gap", () => {
    // 2027-03-14 02:30 does not exist in New York (clocks jump 02:00 → 03:00)
    const d = zonedLocalToUtc("2027-03-14T02:30", "America/New_York");
    expect(d.toISOString()).toBe("2027-03-14T07:30:00.000Z"); // 03:30 EDT
  });

  it("handles UTC and half-hour offsets", () => {
    expect(zonedLocalToUtc("2027-01-01T00:00", "UTC").toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(zonedLocalToUtc("2027-01-01T12:00", "Asia/Kolkata").toISOString()).toBe("2027-01-01T06:30:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(() => zonedLocalToUtc("2027-01-01 08:00", BKK)).toThrow(RangeError);
  });
});

describe("addDays / eachDateKey", () => {
  it("adds calendar days across month and year ends", async () => {
    const { addDays, eachDateKey } = await import(".");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(eachDateKey("2026-12-31", "2027-01-03")).toEqual(["2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(eachDateKey("2027-01-02", "2027-01-01")).toEqual([]);
  });
});

describe("toLocalHHMM / dayTimeToUtc", () => {
  it("round-trips times on a trip day, including after midnight", async () => {
    const { toLocalHHMM, dayTimeToUtc } = await import(".");
    expect(toLocalHHMM("2026-12-31T12:00:00Z", "Asia/Bangkok")).toBe("19:00");
    expect(dayTimeToUtc("2026-12-31", "19:00", 4, "Asia/Bangkok").toISOString()).toBe("2026-12-31T12:00:00.000Z");
    expect(dayTimeToUtc("2026-12-31", "00:30", 4, "Asia/Bangkok").toISOString()).toBe("2026-12-31T17:30:00.000Z");
    expect(dayTimeToUtc("2026-12-31", "04:00", 4, "Asia/Bangkok").toISOString()).toBe("2026-12-30T21:00:00.000Z");
  });
});
