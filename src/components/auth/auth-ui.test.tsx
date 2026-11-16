// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeOtp } from "@/components/ui/OtpInput";
import type { AuthContextValue } from "@/services/auth/AuthProvider";
import { AuthGate } from "./AuthGate";
import { RESEND_AFTER_MS, resendSecondsLeft } from "./LoginScreen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

let auth: Partial<AuthContextValue> = {};
vi.mock("@/services/auth/AuthProvider", () => ({ useAuth: () => auth }));

beforeEach(() => replace.mockClear());
afterEach(() => cleanup());

describe("sanitizeOtp", () => {
  it.each([
    ["12345678", "12345678"],
    ["1234 5678", "12345678"],
    ["1234-5678", "12345678"],
    ["12a3b4", "1234"],
    ["1234567890", "12345678"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(sanitizeOtp(input)).toBe(expected);
  });
});

describe("resendSecondsLeft", () => {
  it("is 0 before a code was sent or before mount", () => {
    expect(resendSecondsLeft(null, 1000)).toBe(0);
    expect(resendSecondsLeft(1000, null)).toBe(0);
  });

  it("counts down 60 seconds, rounding up", () => {
    expect(resendSecondsLeft(0, 0)).toBe(60);
    expect(resendSecondsLeft(0, 500)).toBe(60);
    expect(resendSecondsLeft(0, 59_001)).toBe(1);
    expect(resendSecondsLeft(0, RESEND_AFTER_MS)).toBe(0);
    expect(resendSecondsLeft(0, RESEND_AFTER_MS + 5000)).toBe(0);
  });
});

describe("AuthGate", () => {
  const renderGate = () => render(<AuthGate><p>app content</p></AuthGate>);

  it("shows the app when signed in", () => {
    auth = { status: "signed_in", hasLocalData: null };
    renderGate();
    expect(screen.getByText("app content")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a splash while loading", () => {
    auth = { status: "loading", hasLocalData: null };
    renderGate();
    expect(screen.queryByText("app content")).toBeNull();
    expect(screen.getByRole("status", { name: "กำลังโหลด" })).toBeTruthy();
  });

  it.each(["signed_out", "session_expired"] as const)("%s without local data → /login", (status) => {
    auth = { status, hasLocalData: false };
    renderGate();
    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("app content")).toBeNull();
  });

  it("session expired with local data → app stays open (read-only)", () => {
    auth = { status: "session_expired", hasLocalData: true };
    renderGate();
    expect(screen.getByText("app content")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("waits for the local data check before deciding", () => {
    auth = { status: "session_expired", hasLocalData: null };
    renderGate();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("app content")).toBeNull();
  });
});
