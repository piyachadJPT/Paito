// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clock } from "@/lib/clock";
import { useClockSimulated, useNow } from "./useNow";

const START = Date.parse("2026-12-31T00:50:00.250Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  clock.reset();
});

afterEach(() => {
  cleanup(); // no vitest globals → Testing Library does not auto-cleanup
  clock.reset();
  vi.useRealTimers();
});

describe("useNow", () => {
  it("returns the clock time after mount", () => {
    const { result } = renderHook(() => useNow());
    expect(result.current?.getTime()).toBe(START);
  });

  it("re-renders on the next second boundary, then every second", () => {
    const { result } = renderHook(() => useNow());
    act(() => { vi.advanceTimersByTime(750); });
    expect(result.current?.toISOString()).toBe("2026-12-31T00:50:01.000Z");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current?.toISOString()).toBe("2026-12-31T00:50:02.000Z");
  });

  it("recomputes immediately when the app becomes visible again", () => {
    const { result } = renderHook(() => useNow());
    // Simulate iOS suspending timers: time jumps without timers firing
    vi.setSystemTime(START + 10 * 60_000);
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(result.current?.getTime()).toBe(START + 10 * 60_000);
  });

  it.each(["pageshow", "focus"])("recomputes immediately on window %s", (type) => {
    const { result } = renderHook(() => useNow());
    vi.setSystemTime(START + 5 * 60_000);
    act(() => { window.dispatchEvent(new Event(type)); });
    expect(result.current?.getTime()).toBe(START + 5 * 60_000);
  });

  it("follows the simulated clock", () => {
    const { result } = renderHook(() => useNow());
    act(() => { clock.setSimulated(Date.parse("2027-01-01T03:00:00Z")); });
    expect(result.current?.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    act(() => { clock.shift(15 * 60_000); });
    expect(result.current?.toISOString()).toBe("2027-01-01T03:15:00.000Z");
  });

  it("shares one ticker between components and stops when all unmount", () => {
    const a = renderHook(() => useNow());
    const b = renderHook(() => useNow());
    expect(a.result.current?.getTime()).toBe(b.result.current?.getTime());
    act(() => a.unmount());
    expect(vi.getTimerCount()).toBe(1); // b still subscribed
    act(() => b.unmount());
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useClockSimulated", () => {
  it("reflects simulation state", () => {
    const { result } = renderHook(() => useClockSimulated());
    expect(result.current).toBe(false);
    act(() => { clock.setSimulated(0); });
    expect(result.current).toBe(true);
    act(() => { clock.reset(); });
    expect(result.current).toBe(false);
  });
});
