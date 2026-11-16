// @vitest-environment happy-dom
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { clock } from "@/lib/clock";
import { parseTripFile } from "@/lib/import/import-schema";
import { db } from "@/services/data/db";
import { clearLocal } from "@/services/data/local";
import { importTrip } from "@/services/data/repo";
import { at, iso, rawSeed } from "@/test/seed";
import { NowScreen, tintFor } from "./NowScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/" }));
vi.mock("@/services/auth/AuthProvider", () => ({
  useAuth: () => ({ status: "signed_in", user: { id: "user-1", email: "me@example.com" }, readOnly: false, hasLocalData: true }),
}));

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

let n = 0;
beforeEach(async () => {
  localStorage.clear();
  await clearLocal(db);
  const parsed = parseTripFile(rawSeed);
  if (!parsed.ok) throw new Error();
  await importTrip({ db, userId: "user-1", newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, nowIso: () => "2026-11-20T03:00:00.000Z" }, parsed.file);
});
afterEach(() => {
  cleanup();
  clock.reset();
});

const stop = async (name: string) => (await db.trip_stops.toArray()).find((s) => s.name === name)!;
const TEMPLE = "วัดพระธาตุลำปางหลวง";

async function renderAt(local: string) {
  clock.setSimulated(at(local));
  render(
    <ToastProvider>
      <NowScreen />
    </ToastProvider>,
  );
}

describe("NowScreen (seed + simulated clock)", () => {
  it("2026-11-20 10:00 → before_trip 'อีก 41 วันถึงทริป'", async () => {
    await renderAt("2026-11-20T10:00");
    const card = await screen.findByRole("region", { name: "ตอนนี้" });
    expect(card.textContent?.replace(/\s+/g, " ")).toContain("อีก 41 วันถึงทริป");
    expect(card.textContent).toContain("Day 1 ออก 08:00 น. จาก บ้าน (ลำพูน)");
  });

  it("07:50 → pre_departure with a departure alert that can be dismissed", async () => {
    await renderAt("2026-12-31T07:50");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/อีก (10|9) นาทีต้องออกไป วัดพระธาตุลำปางหลวง/);
    expect(screen.getByText(/ออกจาก/).textContent).toContain("บ้าน (ลำพูน)");
    fireEvent.click(within(alert).getByRole("button", { name: "ปิดการเตือน" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByRole("link", { name: /นำทางไป วัดพระธาตุลำปางหลวง/ }).getAttribute("href")).toContain("google.com/maps/dir");
  });

  it("08:30 → in_transit; 'ถึงแล้ว' moves to at_stop: leave 10:50, 10 min late box", async () => {
    await renderAt("2026-12-31T08:30");
    expect(await screen.findByText("กำลังไป")).toBeTruthy();
    expect(screen.getByText(/ถึงประมาณ/).textContent).toContain("09:20 น.");

    clock.setSimulated(at("2026-12-31T09:30"));
    fireEvent.click(screen.getByRole("button", { name: `ถึง ${TEMPLE} แล้ว` }));
    expect(await screen.findByText("ตอนนี้อยู่ที่")).toBeTruthy();
    expect((await stop(TEMPLE)).started_at).toBe(iso("2026-12-31T09:30")); // whole minute (D33)
    expect(screen.getByText("ออก 10:50 น.")).toBeTruthy();
    expect(screen.getByText("ถ้าเที่ยวครบเวลา จะช้ากว่าแผน 10 นาที")).toBeTruthy();
    expect(screen.getByRole("button", { name: "เลื่อนแผนที่เหลือ +10 นาที" })).toBeTruthy();
  });

  it("'ออกตามแผน' hides the late box and counts the visit down to the departure", async () => {
    await db.trip_stops.put({ ...(await stop(TEMPLE)), status: "in_progress", started_at: iso("2026-12-31T09:30") });
    await renderAt("2026-12-31T10:00");
    fireEvent.click(await screen.findByRole("button", { name: "ออกตามแผน" }));
    expect(await screen.findByText("เวลาเที่ยวเหลือ (ออกตามแผน)")).toBeTruthy();
    expect(screen.queryByText(/จะช้ากว่าแผน/)).toBeNull();
  });

  it("10:36 → alert 'อีก 14 นาทีต้องออก…' and a badge-worthy alert", async () => {
    await db.trip_stops.put({ ...(await stop(TEMPLE)), status: "in_progress", started_at: iso("2026-12-31T09:30") });
    await renderAt("2026-12-31T10:36");
    expect((await screen.findByRole("alert")).textContent).toMatch(/อีก 1[34] นาทีต้องออกไป พิพิธภัณฑ์เซรามิคธนบดี/);
  });

  it("'เลื่อนแผนที่เหลือ' shows a preview and saves the shift", async () => {
    await db.trip_stops.put({ ...(await stop(TEMPLE)), status: "in_progress", started_at: iso("2026-12-31T09:30") });
    await renderAt("2026-12-31T10:00");
    fireEvent.click(await screen.findByRole("button", { name: "เลื่อนแผนที่เหลือ +10 นาที" }));
    const sheet = await screen.findByRole("dialog", { name: "เลื่อนแผนที่เหลือ" });
    expect(sheet.textContent).toContain("ออกจาก วัดพระธาตุลำปางหลวง 11:00 น.");
    expect(sheet.textContent).toContain("ถึง ที่พักลำปาง 00:45 น."); // fixed festival absorbs it
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "ยืนยัน" })));
    await waitFor(async () => expect((await stop("พิพิธภัณฑ์เซรามิคธนบดี")).planned_arrival_at).toBe(iso("2026-12-31T11:30")));
  });

  it("all of Day 1 done → day_done 'พรุ่งนี้ออก 09:30 น. จาก ที่พักลำปาง'", async () => {
    const day1Id = (await db.trip_days.toArray()).find((d) => d.day_number === 1)!.id;
    const day1 = (await db.trip_stops.toArray()).filter((s) => s.trip_day_id === day1Id);
    for (const s of day1.filter((s) => s.sort_order > 0)) await db.trip_stops.put({ ...s, status: "completed" });
    await renderAt("2027-01-01T00:50");
    const card = await screen.findByRole("region", { name: "ตอนนี้" });
    expect(card.textContent).toContain("จบวันนี้แล้ว");
    expect(card.textContent).toContain("พรุ่งนี้ออก 09:30 น. จาก ที่พักลำปาง");
    expect(screen.getByRole("link", { name: /ดูแผนพรุ่งนี้/ }).getAttribute("href")).toBe("/plan?day=2");
  });

  it("2027-01-04 10:00 → after_trip", async () => {
    await renderAt("2027-01-04T10:00");
    expect(await screen.findByText("จบทริปแล้ว")).toBeTruthy();
    expect(screen.getByText(/ไป 0 จาก 14 ที่/)).toBeTruthy();
  });

  it("stale in-progress from yesterday can be closed in one tap (D9)", async () => {
    await db.trip_stops.put({ ...(await stop("Lampang Festival — สวนสาธารณะหนองกระทิง")), status: "in_progress", started_at: iso("2026-12-31T19:00") });
    await renderAt("2027-01-01T09:00");
    fireEvent.click(await screen.findByRole("button", { name: "ปิดเป็นเสร็จ" }));
    await waitFor(async () => expect((await stop("Lampang Festival — สวนสาธารณะหนองกระทิง")).status).toBe("completed"));
  });
});

describe("tintFor", () => {
  it.each([
    [7, "bg-tint-morning"],
    [12, "bg-tint-day"],
    [17, "bg-tint-evening"],
    [21, "bg-tint-night"],
    [2, "bg-tint-night"],
  ])("%d h → %s", (hour, cls) => {
    expect(tintFor(hour)).toBe(cls);
  });
});
