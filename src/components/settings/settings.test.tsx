// @vitest-environment happy-dom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTripFile } from "@/lib/import/import-schema";
import { db } from "@/services/data/db";
import { clearLocal } from "@/services/data/local";
import { importTrip } from "@/services/data/repo";
import { rawSeed } from "@/test/seed";
import { SettingsScreen } from "./SettingsScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/services/auth/AuthProvider", () => ({
  useAuth: () => ({
    status: "signed_in",
    user: { id: "user-1", email: "me@example.com" },
    readOnly: false,
    hasLocalData: true,
    signOut: vi.fn(),
    refreshLocalData: vi.fn(),
  }),
}));

// happy-dom has no showModal; the sheets only need open/close to not throw
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

let n = 0;
const repo = () => ({ db, userId: "user-1", newId: () => `id-${++n}`, nowIso: () => "2026-11-20T03:00:00.000Z" });

beforeEach(async () => {
  await clearLocal(db);
});
afterEach(() => cleanup());

describe("SettingsScreen", () => {
  it("empty state offers create and import", async () => {
    render(<SettingsScreen />);
    expect(await screen.findByText("ยังไม่มีทริป")).toBeTruthy();
    expect(screen.getByRole("button", { name: /สร้างทริปใหม่/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /นำเข้าไฟล์/ })).toBeTruthy();
    expect(screen.getByText("me@example.com")).toBeTruthy();
  });

  it("shows the active trip, its note editor, alert minutes and the trip list", async () => {
    const parsed = parseTripFile(rawSeed);
    if (!parsed.ok) throw new Error();
    await importTrip(repo(), parsed.file);

    render(<SettingsScreen />);
    expect(await screen.findAllByText("ทริปปีใหม่ ลำปาง–เชียงราย")).toHaveLength(2); // card + list
    expect(screen.getByText("พฤ. 31 ธ.ค. 2569 – อา. 3 ม.ค. 2570")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "15" }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("ข้อมูลสำคัญของทริป") as HTMLTextAreaElement).value).toContain("ที่พักลำปาง");
    expect(screen.getByText("รอส่ง 3 รายการ")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "20" }));
    await waitFor(async () => expect((await db.trips.toArray())[0].departure_alert_minutes).toBe(20));
  });
});
