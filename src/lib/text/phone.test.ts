import { describe, expect, it } from "vitest";
import { splitPhones } from "./phone";

describe("splitPhones", () => {
  it("finds mobile, landline, +66 and hotline numbers", () => {
    const parts = splitPhones("ที่พัก 081-234-5678 · โรงแรม 054 123 456 · +66 81 234 5678 · ฉุกเฉิน 1669");
    expect(parts.filter((p) => p.kind === "phone").map((p) => (p.kind === "phone" ? p.tel : ""))).toEqual([
      "0812345678",
      "054123456",
      "+66812345678",
      "1669",
    ]);
    expect(parts.map((p) => p.text).join("")).toBe("ที่พัก 081-234-5678 · โรงแรม 054 123 456 · +66 81 234 5678 · ฉุกเฉิน 1669");
  });

  it("leaves text without numbers alone and ignores booking codes", () => {
    expect(splitPhones("เลขจอง ABC123")).toEqual([{ kind: "text", text: "เลขจอง ABC123" }]);
    expect(splitPhones("")).toEqual([]);
  });
});
