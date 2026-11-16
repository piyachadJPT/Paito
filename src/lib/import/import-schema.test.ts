import { describe, expect, it } from "vitest";
import { analyzeDay } from "@/lib/schedule/recalculate";
import { at, iso, loadSeed, rawSeed } from "@/test/seed";
import { parseTripFile, tripFileToRows } from "./import-schema";

type RawStop = { name: string; _expect_arrive?: string; _expect_depart?: string };

describe("seed-trip.json import", () => {
  const seed = loadSeed();

  it("passes validation and creates 1 trip, 4 days, 25 stops", () => {
    expect(seed.trip.name).toBe("ทริปปีใหม่ ลำปาง–เชียงราย");
    expect(seed.days.map((d) => d.date)).toEqual(["2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(seed.stops).toHaveLength(25);
  });

  it("matches every _expect_arrive / _expect_depart", () => {
    let checked = 0;
    for (const day of rawSeed.days) {
      const stops = seed.dayStops(day.day_number);
      (day.stops as RawStop[]).forEach((raw, i) => {
        const row = stops[i];
        expect(row.name).toBe(raw.name);
        if (raw._expect_arrive) {
          expect(row.planned_arrival_at, `${raw.name} arrive`).toBe(iso(raw._expect_arrive));
          checked++;
        }
        if (raw._expect_depart) {
          expect(row.planned_departure_at, `${raw.name} depart`).toBe(iso(raw._expect_depart));
          checked++;
        }
      });
    }
    expect(checked).toBe(46); // 21 non-origin stops × 2 + 4 origins
  });

  it("Lampang Festival is fixed at 19:00 with a 20-minute gap and leaves 00:30 next day", () => {
    const festival = seed.stopByName(1, "Lampang Festival — สวนสาธารณะหนองกระทิง");
    expect(festival.is_fixed).toBe(true);
    expect(festival.planned_arrival_at).toBe(iso("2026-12-31T19:00"));
    expect(festival.planned_departure_at).toBe(iso("2027-01-01T00:30"));
    const analysis = analyzeDay(seed.dayStops(1));
    expect(analysis.gaps).toEqual([{ stopId: festival.id, minutes: 20 }]);
    expect(analysis.conflicts).toEqual([]);
    expect(analysis.changed).toEqual([]); // already consistent
  });

  it("origins: lodging, departure only, no travel, sort_order = index × 1000", () => {
    for (const day of seed.days) {
      const [origin, ...rest] = seed.dayStops(day.day_number);
      expect(origin.stop_type).toBe("lodging");
      expect(origin.travel_minutes).toBeNull();
      expect(origin.planned_arrival_at).toBeNull();
      expect(origin.planned_departure_at).not.toBeNull();
      rest.forEach((s, i) => expect(s.sort_order).toBe((i + 1) * 1000));
    }
    expect(seed.stopByName(1, "บ้าน (ลำพูน)").planned_departure_at).toBe(new Date(at("2026-12-31T08:00")).toISOString());
  });

  it("ignores _ fields and keeps notes", () => {
    const row = seed.stopByName(2, "ถนนคนเดินสายวัฒนธรรม") as unknown as Record<string, unknown>;
    expect(Object.keys(row).some((k) => k.startsWith("_"))).toBe(false);
    expect(row.note).toContain("1 ม.ค. 2570");
    expect(seed.trip.note).toContain("ที่พักลำปาง");
  });

  it("links rows by id", () => {
    expect(seed.days.every((d) => d.trip_id === seed.trip.id)).toBe(true);
    expect(seed.stops.every((s) => s.trip_id === seed.trip.id)).toBe(true);
    expect(new Set(seed.stops.map((s) => s.id)).size).toBe(25);
  });
});

describe("parseTripFile validation", () => {
  const minimal = () => ({
    version: 1,
    trip: { name: "ทดสอบ", start_date: "2027-02-01", end_date: "2027-02-02" },
    days: [
      {
        day_number: 1,
        date: "2027-02-01",
        stops: [
          { name: "บ้าน", type: "lodging", depart_at: "2027-02-01T08:00" },
          { name: "A", travel_minutes: 20, duration_minutes: 60 },
        ],
      },
    ],
  });

  it("accepts a minimal file and applies defaults", () => {
    const r = parseTripFile(minimal());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.trip.timezone).toBe("Asia/Bangkok");
    expect(r.file.trip.day_cutoff_hour).toBe(4);
    expect(r.file.trip.departure_alert_minutes).toBe(15);
    expect(r.file.days[0].stops[1].type).toBe("sight");
  });

  const cases: [string, (f: ReturnType<typeof minimal>) => void, string][] = [
    ["wrong version", (f) => ((f as { version: number }).version = 2), "version"],
    ["origin not lodging", (f) => (f.days[0].stops[0].type = "sight"), "จุดแรกของวันต้องเป็นที่พัก"],
    ["origin without depart_at", (f) => delete (f.days[0].stops[0] as { depart_at?: string }).depart_at, "ต้องมี depart_at"],
    ["depart_at on a later stop", (f) => ((f.days[0].stops[1] as { depart_at?: string }).depart_at = "2027-02-01T09:00"), "เฉพาะจุดแรก"],
    ["bad local time", (f) => (f.days[0].stops[0].depart_at = "2027-02-01 08:00"), "YYYY-MM-DDTHH:MM"],
    ["end before start", (f) => (f.trip.end_date = "2027-01-31"), "วันจบ"],
    ["unknown timezone", (f) => ((f.trip as { timezone?: string }).timezone = "Mars/Base"), "timezone"],
    ["day outside the trip", (f) => (f.days[0].date = "2027-03-01"), "นอกช่วงทริป"],
    ["duplicate day", (f) => f.days.push({ ...f.days[0] }), "ซ้ำ"],
    ["latitude without longitude", (f) => ((f.days[0].stops[1] as { latitude?: number }).latitude = 18.2), "longitude"],
    ["negative duration", (f) => (f.days[0].stops[1].duration_minutes = -5), "duration_minutes"],
    ["empty day", (f) => (f.days[0].stops = []), "อย่างน้อย 1 จุด"],
    [
      "two stops in progress",
      (f) => {
        f.days[0].stops.push({ name: "B", travel_minutes: 5, duration_minutes: 5 });
        Object.assign(f.days[0].stops[1], { status: "in_progress" });
        Object.assign(f.days[0].stops[2], { status: "in_progress" });
      },
      "ทีละ 1 จุด",
    ],
  ];

  it.each(cases)("rejects: %s", (_label, mutate, expected) => {
    const f = minimal();
    mutate(f);
    const r = parseTripFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toContain(expected);
  });

  it("rejects non-objects", () => {
    expect(parseTripFile(null).ok).toBe(false);
    expect(parseTripFile("trip").ok).toBe(false);
  });
});

describe("tripFileToRows", () => {
  it("keeps backup extras (D10) and leaves started stops' times alone", () => {
    const r = parseTripFile({
      version: 1,
      trip: { name: "x", start_date: "2027-02-01", end_date: "2027-02-01", timezone: "UTC" },
      days: [
        {
          day_number: 1,
          date: "2027-02-01",
          stops: [
            { name: "o", type: "lodging", depart_at: "2027-02-01T08:00" },
            {
              name: "a",
              travel_minutes: 30,
              duration_minutes: 60,
              status: "completed",
              started_at: "2027-02-01T08:40:00+00:00",
              completed_at: "2027-02-01T09:35:00Z",
              latitude: 18.123456789,
              longitude: 99.5,
              maps_url: "https://maps.app.goo.gl/abc",
            },
            { name: "b", travel_minutes: null, duration_minutes: 10, travel_needs_review: true },
          ],
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rows = tripFileToRows(r.file, { newId: () => crypto.randomUUID(), now: "2027-01-01T00:00:00.000Z" });
    const [, a, b] = rows.stops;
    expect(a.status).toBe("completed");
    expect(a.started_at).toBe("2027-02-01T08:40:00.000Z");
    expect(a.planned_arrival_at).toBeNull(); // completed: not recalculated
    expect(a.latitude).toBe(18.123456789);
    expect(b.travel_needs_review).toBe(true);
    expect(b.travel_minutes).toBeNull();
    expect(rows.trip.timezone).toBe("UTC");
    expect(rows.trip.created_at).toBe("2027-01-01T00:00:00.000Z");
  });
});
