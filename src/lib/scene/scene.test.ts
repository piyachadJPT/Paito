import { describe, expect, it } from "vitest";
import type { StopType } from "@/lib/schedule/types";
import { pickScene, skySlot, type LocalTime, type SceneInput } from ".";

const at = (hour: number, month = 12, day = 30): LocalTime => ({ month, day, hour });
const stopAt = (name: string, stop_type: StopType, hour = 11): [SceneInput, LocalTime] => [
  { kind: "at_stop", stop: { name, stop_type } },
  at(hour),
];

describe("skySlot", () => {
  it.each([
    [4, "late"],
    [5, "dawn"],
    [6, "dawn"],
    [7, "morning"],
    [9, "morning"],
    [10, "day"],
    [15, "day"],
    [16, "evening"],
    [18, "evening"],
    [19, "night"],
    [22, "night"],
    [23, "late"],
    [0, "late"],
  ])("%i h → %s", (hour, slot) => {
    expect(skySlot(hour)).toBe(slot);
  });
});

describe("pickScene subjects", () => {
  it.each([
    ["วัดพระธาตุลำปางหลวง", "sight", 11, "temple"],
    ["พิพิธภัณฑ์เซรามิคธนบดี", "sight", 11, "museum"],
    ["ดอยตุง", "sight", 11, "viewpoint"],
    ["Wat Rong Khun Temple", "sight", 11, "temple"],
    ["น้ำตกขุนกรณ์", "sight", 11, "waterfall"],
    ["ถนนคนเดินกาดกองต้า", "sight", 19, "market"],
    ["ไร่ชาฉุยฟง", "sight", 11, "farm"],
    ["หอนาฬิกา", "sight", 11, "sight"],
    // every sight in the seed trip
    ["Lampang Festival — สวนสาธารณะหนองกระทิง", "sight", 20, "market"],
    ["บ่อน้ำพุร้อนแจ้ซ้อน", "sight", 11, "waterfall"],
    ["อุทยานแห่งชาติแจ้ซ้อน", "sight", 11, "viewpoint"],
    ["เชียงรายไนท์บาซาร์", "sight", 20, "market"],
    ["วัดร่องเสือเต้น (วัดสีน้ำเงิน)", "sight", 11, "temple"],
    ["สะพานรัษฎาภิเศก", "sight", 11, "sight"],
    // review: "ภูมิ" is not a mountain, historical parks are not viewpoints
    ["พิพิธภัณฑ์ภูมิปัญญาล้านนา", "sight", 11, "museum"],
    ["ศูนย์การเรียนรู้ภูมิภาค", "sight", 11, "sight"],
    ["อุทยานประวัติศาสตร์สุโขทัย", "sight", 11, "sight"],
    ["ภูชี้ฟ้า", "sight", 6, "viewpoint"],
    // a park is not a farm
    ["สวนสาธารณะหนองกระทิง", "sight", 11, "sight"],
    ["สวนดอกไม้ดอยตุง", "sight", 11, "viewpoint"],
    ["สวนชาวังพุดตาล", "sight", 11, "farm"],
    ["Clock Tower", "sight", 11, "sight"],
    ["Blue Coffee", "food", 13, "cafe"],
    ["ร้านข้าวซอย", "food", 12, "lunch"],
    ["ร้านโจ๊ก", "food", 8, "breakfast"],
    ["ร้านข้าวต้ม", "food", 5, "breakfast"],
    ["หมูกระทะ", "food", 20, "dinner"],
    ["ร้านอาหารริมน้ำ", "food", 17, "dinner"],
    ["ก๋วยเตี๋ยวเรือ", "food", 1, "late_meal"],
    ["ปั๊ม ปตท.", "rest", 11, "rest_stop"],
    ["คาเฟ่ริมทาง", "rest", 15, "cafe"],
    ["ที่พักลำปาง", "lodging", 21, "lodging"],
  ] as const)("%s (%s, %i h) → %s", (name, type, hour, subject) => {
    expect(pickScene(...stopAt(name, type, hour)).subject).toBe(subject);
  });

  it("ignores case in keywords", () => {
    expect(pickScene(...stopAt("SUNSET VIEWPOINT", "sight")).subject).toBe("viewpoint");
    expect(pickScene(...stopAt("Doi Mae Salong COFFEE", "food")).subject).toBe("cafe");
  });

  it("maps the other states", () => {
    const home = { name: "บ้าน (ลำพูน)", stop_type: "lodging" as const };
    const temple = { name: "วัดพระธาตุลำปางหลวง", stop_type: "sight" as const };
    expect(pickScene({ kind: "pre_departure", stop: home }, at(7)).subject).toBe("departing");
    expect(pickScene({ kind: "in_transit", stop: temple }, at(9)).subject).toBe("driving");
    expect(pickScene({ kind: "in_transit", stop: temple, probablyArrived: true }, at(9)).subject).toBe("arriving");
    expect(pickScene({ kind: "before_trip", stop: null }, at(10)).subject).toBe("before_trip");
    expect(pickScene({ kind: "after_trip", stop: null }, at(10)).subject).toBe("trip_done");
    expect(pickScene({ kind: "no_trip", stop: null }, at(10)).subject).toBe("empty");
  });

  it("day_done always shows a night sky", () => {
    const lodging = { name: "ที่พัก", stop_type: "lodging" as const };
    expect(pickScene({ kind: "day_done", stop: lodging }, at(18))).toEqual({ sky: "night", subject: "night_in", extras: [] });
    expect(pickScene({ kind: "day_done", stop: lodging }, at(1)).sky).toBe("late");
    expect(pickScene({ kind: "day_done", stop: null }, at(14)).sky).toBe("night");
  });

  it("uses the time-of-day sky everywhere else", () => {
    expect(pickScene(...stopAt("วัด", "sight", 6)).sky).toBe("dawn");
    expect(pickScene(...stopAt("วัด", "sight", 17)).sky).toBe("evening");
  });
});

describe("pickScene extras", () => {
  const temple: SceneInput = { kind: "at_stop", stop: { name: "วัด", stop_type: "sight" } };

  it.each([
    [{ month: 12, day: 31, hour: 21 }, ["fireworks"]],
    [{ month: 12, day: 31, hour: 23 }, ["fireworks"]],
    // after midnight the calendar says 1 Jan while the trip day is still 31 Dec
    [{ month: 1, day: 1, hour: 0 }, ["fireworks"]],
    [{ month: 1, day: 1, hour: 4 }, ["fireworks"]],
    [{ month: 1, day: 1, hour: 6 }, ["new_year"]],
    [{ month: 1, day: 1, hour: 7 }, ["new_year"]],
    [{ month: 1, day: 1, hour: 12 }, []],
    [{ month: 12, day: 31, hour: 14 }, []],
    [{ month: 12, day: 30, hour: 21 }, []],
  ])("%o → %o", (local, extras) => {
    expect(pickScene(temple, local).extras).toEqual(extras);
  });

  it("adds the alarm sticker when behind", () => {
    expect(pickScene({ ...temple, behind: true }, at(11)).extras).toEqual(["alarm"]);
    expect(pickScene({ ...temple, behind: true }, { month: 12, day: 31, hour: 21 }).extras).toEqual(["fireworks", "alarm"]);
  });
});
