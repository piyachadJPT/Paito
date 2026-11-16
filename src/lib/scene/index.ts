/**
 * Which picture goes on the Now page postcard (SPEC U11, design doc §7).
 * Pure: the caller passes the trip-local time; nothing here reads a clock.
 */
import type { NowState } from "@/lib/schedule/now-state";
import type { StopType } from "@/lib/schedule/types";

export type SkySlot = "dawn" | "morning" | "day" | "evening" | "night" | "late";

export type SceneSubject =
  | "temple"
  | "viewpoint"
  | "waterfall"
  | "museum"
  | "market"
  | "farm"
  | "sight"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "late_meal"
  | "cafe"
  | "rest_stop"
  | "lodging"
  | "departing"
  | "driving"
  | "arriving"
  | "night_in"
  | "before_trip"
  | "trip_done"
  | "empty";

export type SceneExtra = "fireworks" | "new_year" | "alarm";

export interface SceneInput {
  kind: NowState["kind"] | "no_trip";
  /** at_stop→current, pre_departure→origin, in_transit→next, day_done→lodging */
  stop: { name: string; stop_type: StopType } | null;
  probablyArrived?: boolean;
  /** overdue / late / in-transit late — adds the alarm sticker */
  behind?: boolean;
}

/** Trip-local calendar month (1–12), day and hour (0–23). */
export interface LocalTime {
  month: number;
  day: number;
  hour: number;
}

export interface Scene {
  sky: SkySlot;
  subject: SceneSubject;
  extras: SceneExtra[];
}

export function skySlot(hour: number): SkySlot {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  if (hour >= 19 && hour < 23) return "night";
  return "late";
}

type Keywords = readonly (string | RegExp)[];

// Thai words match anywhere in the name; Latin words match whole words only
// (so "art" does not fire on "Smart Hotel"). Order matters: first match wins.
const SIGHT_KEYWORDS: readonly [SceneSubject, Keywords][] = [
  ["temple", ["วัด", "พระธาตุ", "temple"]],
  ["museum", ["พิพิธภัณฑ์", "หอศิลป์", "museum", "art"]],
  // "ภู" = mountain, but not "ภูมิ" (region / wisdom); "อุทยาน" alone also means historical parks
  ["viewpoint", ["ดอย", /ภู(?!มิ)/, "จุดชมวิว", "ม่อน", "อุทยานแห่งชาติ", "viewpoint"]],
  ["waterfall", ["น้ำตก", "ทะเลสาบ", "บ่อน้ำร้อน", "น้ำพุร้อน", "hot spring", "waterfall"]],
  ["market", ["ตลาด", "ถนนคนเดิน", "บาซาร์", "เทศกาล", "market", "bazaar", "festival"]],
  // "สวน" alone also means a public park (สวนสาธารณะ), so only plantation-style gardens
  ["farm", ["ไร่", "สวนชา", "สวนกาแฟ", "สวนผลไม้", "สวนสตรอว์เบอร์รี", "ฟาร์ม", "farm"]],
];
const CAFE_KEYWORDS: Keywords = ["คาเฟ่", "กาแฟ", "coffee", "cafe"];

const LATIN = /^[a-z ]+$/;

function matches(name: string, words: Keywords): boolean {
  const lower = name.toLowerCase();
  return words.some((w) =>
    w instanceof RegExp ? w.test(lower) : LATIN.test(w) ? new RegExp(`\\b${w}\\b`).test(lower) : lower.includes(w),
  );
}

function mealFor(slot: SkySlot): SceneSubject {
  switch (slot) {
    case "dawn":
    case "morning":
      return "breakfast";
    case "day":
      return "lunch";
    case "evening":
    case "night":
      return "dinner";
    case "late":
      return "late_meal";
  }
}

function stopSubject(stop: NonNullable<SceneInput["stop"]>, slot: SkySlot): SceneSubject {
  switch (stop.stop_type) {
    case "lodging":
      return "lodging";
    case "rest":
      return matches(stop.name, CAFE_KEYWORDS) ? "cafe" : "rest_stop";
    case "food":
      return matches(stop.name, CAFE_KEYWORDS) ? "cafe" : mealFor(slot);
    case "sight":
      return SIGHT_KEYWORDS.find(([, words]) => matches(stop.name, words))?.[0] ?? "sight";
  }
}

function subjectFor(input: SceneInput, slot: SkySlot): SceneSubject {
  switch (input.kind) {
    case "before_trip":
      return "before_trip";
    case "after_trip":
      return "trip_done";
    case "no_trip":
      return "empty";
    case "pre_departure":
      return "departing";
    case "in_transit":
      return input.probablyArrived ? "arriving" : "driving";
    case "day_done":
      return "night_in";
    case "at_stop":
      return input.stop ? stopSubject(input.stop, slot) : "sight";
  }
}

export function pickScene(input: SceneInput, local: LocalTime): Scene {
  const slot = skySlot(local.hour);
  // The day is over: always an evening-in sky, darker after 23:00
  const sky: SkySlot = input.kind === "day_done" ? (slot === "late" ? "late" : "night") : slot;

  const extras: SceneExtra[] = [];
  const nye = local.month === 12 && local.day === 31;
  const newYearsDay = local.month === 1 && local.day === 1;
  if ((nye && (slot === "night" || slot === "late")) || (newYearsDay && local.hour < 5)) extras.push("fireworks");
  if (newYearsDay && (slot === "dawn" || slot === "morning")) extras.push("new_year");
  if (input.behind) extras.push("alarm");

  return { sky, subject: subjectFor(input, slot), extras };
}
