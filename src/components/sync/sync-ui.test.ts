import { describe, expect, it, vi } from "vitest";
import { newId } from "@/services/data/id";
import { describeSync } from "./SyncStatusPill";

describe("describeSync", () => {
  const base = { online: true, phase: "idle", pending: 0, failed: 0 };
  it.each([
    [{}, "ออนไลน์"],
    [{ pending: 3 }, "รอส่ง 3"],
    [{ online: false }, "ออฟไลน์"],
    [{ phase: "offline", pending: 2 }, "ออฟไลน์ · รอส่ง 2"],
    [{ failed: 1, pending: 2 }, "ส่งไม่สำเร็จ 1"],
    [{ phase: "syncing" }, "กำลัง sync"],
    [{ phase: "auth_required" }, "ต้องเข้าสู่ระบบ"],
  ])("%j → %s", (over, label) => {
    expect(describeSync({ ...base, ...over }).label).toBe(label);
  });
});

describe("newId", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  it("returns a v4 uuid", () => {
    expect(newId()).toMatch(UUID);
  });
  it("falls back to getRandomValues outside a secure context", () => {
    const spy = vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      throw new Error("insecure");
    });
    const id = newId();
    expect(id).toMatch(UUID);
    expect(newId()).not.toBe(id);
    spy.mockRestore();
  });
});
