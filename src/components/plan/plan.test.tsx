// @vitest-environment happy-dom
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { parseTripFile } from "@/lib/import/import-schema";
import { db } from "@/services/data/db";
import { clearLocal } from "@/services/data/local";
import { importTrip } from "@/services/data/repo";
import { iso, rawSeed } from "@/test/seed";
import { PlanScreen } from "./PlanScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/plan",
  useSearchParams: () => new URLSearchParams("day=1"),
}));
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
  await clearLocal(db);
  const parsed = parseTripFile(rawSeed);
  if (!parsed.ok) throw new Error();
  await importTrip({ db, userId: "user-1", newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, nowIso: () => "2026-11-20T03:00:00.000Z" }, parsed.file);
});
afterEach(() => cleanup());

const stopByName = async (name: string) => (await db.trip_stops.toArray()).find((s) => s.name === name)!;

function renderPlan() {
  return render(
    <ToastProvider>
      <PlanScreen />
    </ToastProvider>,
  );
}

describe("PlanScreen", () => {
  it("shows Day 1 with the ticket, the festival gap and drive rows", async () => {
    renderPlan();
    expect(await screen.findByText("DAY 1 · พฤ. 31 ธ.ค. 2569")).toBeTruthy();
    expect(screen.getByText("ว่าง 20 นาที")).toBeTruthy();
    expect(screen.getByText("วัดพระธาตุลำปางหลวง")).toBeTruthy();
    expect(screen.getAllByText("ยังไม่เริ่ม").length).toBe(7);
  });

  it("step 6: 90 → 120 min, save → next stop +30, festival 19:00 with 'จะถึงช้ากว่าเวลาที่ล็อก 10 นาที'; undo restores", async () => {
    renderPlan();
    fireEvent.click(await screen.findByText("วัดพระธาตุลำปางหลวง"));
    const sheet = await screen.findByRole("dialog", { name: "แก้ไขสถานที่" });
    const plus = within(sheet).getByRole("button", { name: "เพิ่ม 15 นาที" });
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(within(sheet).getByRole("button", { name: "บันทึก" }));

    await waitFor(async () => expect((await stopByName("พิพิธภัณฑ์เซรามิคธนบดี")).planned_arrival_at).toBe(iso("2026-12-31T11:50")));
    expect((await stopByName("Lampang Festival — สวนสาธารณะหนองกระทิง")).planned_arrival_at).toBe(iso("2026-12-31T19:00"));
    expect(await screen.findByText("จะถึงช้ากว่าเวลาที่ล็อก 10 นาที")).toBeTruthy();
    expect(screen.getByText("คำนวณเวลาใหม่แล้ว")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ย้อนกลับ" })));
    await waitFor(async () => expect((await stopByName("พิพิธภัณฑ์เซรามิคธนบดี")).planned_arrival_at).toBe(iso("2026-12-31T11:20")));
    expect((await stopByName("วัดพระธาตุลำปางหลวง")).duration_minutes).toBe(90);
  });

  it("step 6: moving a stop up shows 'ตรวจเวลาขับ'", async () => {
    renderPlan();
    fireEvent.click(await screen.findByText("พิพิธภัณฑ์เซรามิคธนบดี"));
    const sheet = await screen.findByRole("dialog", { name: "แก้ไขสถานที่" });
    fireEvent.click(within(sheet).getByRole("button", { name: "ขึ้น" }));
    expect((await screen.findAllByText("ตรวจเวลาขับ")).length).toBeGreaterThanOrEqual(2);
    expect((await stopByName("พิพิธภัณฑ์เซรามิคธนบดี")).travel_needs_review).toBe(true);
  });

  it("status buttons: arrive → 'กำลังเที่ยว' with an undo toast", async () => {
    renderPlan();
    fireEvent.click(await screen.findByText("วัดพระธาตุลำปางหลวง"));
    const sheet = await screen.findByRole("dialog", { name: "แก้ไขสถานที่" });
    fireEvent.click(within(sheet).getByRole("button", { name: "ถึงแล้ว" }));
    expect(await screen.findByText("กำลังเที่ยว")).toBeTruthy();
    expect(screen.getByText("บันทึกแล้ว")).toBeTruthy();
    expect((await stopByName("วัดพระธาตุลำปางหลวง")).status).toBe("in_progress");
  });

  it("adds a stop before tonight's lodging and opens it", async () => {
    renderPlan();
    fireEvent.click(await screen.findByRole("button", { name: "เพิ่มสถานที่" }));
    expect(await screen.findByDisplayValue("สถานที่ใหม่")).toBeTruthy();
    const added = await stopByName("สถานที่ใหม่");
    expect(added).toMatchObject({ stop_type: "sight", duration_minutes: 60, travel_minutes: null });
  });

  it("'นอนที่นี่' on the day's last place makes it tonight's lodging with no departure time", async () => {
    const day1 = (await db.trip_days.toArray()).find((d) => d.day_number === 1)!;
    const day1Stops = (await db.trip_stops.toArray()).filter((s) => s.trip_day_id === day1.id).sort((a, b) => a.sort_order - b.sort_order);
    const last = day1Stops[day1Stops.length - 1];
    // a last stop that is not lodging yet: arrival 00:45, departure 01:45
    await db.trip_stops.put({ ...last, name: "บ้านเพื่อน", stop_type: "sight", duration_minutes: 60, planned_departure_at: iso("2027-01-01T01:45") });
    renderPlan();
    expect(await screen.findByText("01:45")).toBeTruthy();

    // not offered on a place in the middle of the day
    fireEvent.click(await screen.findByText("วัดพระธาตุลำปางหลวง"));
    let sheet = await screen.findByRole("dialog", { name: "แก้ไขสถานที่" });
    expect(within(sheet).queryByRole("button", { name: "นอนที่นี่" })).toBeNull();
    fireEvent.click(within(sheet).getByRole("button", { name: "ปิด" }));

    fireEvent.click(await screen.findByRole("button", { name: /บ้านเพื่อน/ }));
    sheet = await screen.findByRole("dialog", { name: "แก้ไขสถานที่" });
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "นอนที่นี่" })));
    await waitFor(async () => expect((await stopByName("บ้านเพื่อน")).stop_type).toBe("lodging"));
    expect(screen.queryByText("01:45")).toBeNull();
  });
});
