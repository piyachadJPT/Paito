import { describe, expect, it } from "vitest";
import { formatDuration, formatMinutes } from "./format";

const S = 1000;
const M = 60 * S;
const H = 60 * M;

describe("formatDuration", () => {
  it.each([
    [2 * H, "2 ชม."],
    [H + 52 * M, "1 ชม. 52 นาที"],
    [H + 52 * M + 59 * S, "1 ชม. 52 นาที"], // floors
    [60 * M, "1 ชม."],
    [59 * M + 59 * S, "59 นาที"],
    [42 * M, "42 นาที"],
    [10 * M, "10 นาที"],
    [10 * M - 1, "09:59"],
    [8 * M + 42 * S, "08:42"],
    [S, "00:01"],
    [S - 1, "00:00"],
    [0, "00:00"],
    [26 * H, "26 ชม."],
  ])("%d ms → %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });

  it.each([
    [-7 * M, "เกินมา 7 นาที"],
    [-(7 * M + 59 * S), "เกินมา 7 นาที"],
    [-(H + 5 * M), "เกินมา 1 ชม. 5 นาที"],
    [-2 * H, "เกินมา 2 ชม."],
    [-42 * S, "เกินมาไม่ถึง 1 นาที"],
  ])("negative %d ms → %s (minutes only, D4)", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe("formatMinutes", () => {
  it("formats whole minutes and clamps negatives", () => {
    expect(formatMinutes(0)).toBe("0 นาที");
    expect(formatMinutes(90)).toBe("1 ชม. 30 นาที");
    expect(formatMinutes(-3)).toBe("0 นาที");
  });
});
