"use client";

import { useMemo, useSyncExternalStore } from "react";
import { clock as appClock, type Clock } from "@/lib/clock";

/**
 * A store that re-reads `clock.nowMs()` on every second boundary and right
 * away when the app comes back (visibilitychange / pageshow / focus) or the
 * simulated clock changes.
 *
 * The timer only triggers re-renders; the value always comes from the clock,
 * so a suspended timer (iOS background) never makes time drift.
 */
export function createNowStore(clock: Clock) {
  let current: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribeClock: (() => void) | undefined;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());

  const schedule = () => {
    clearTimeout(timer);
    const ms = clock.nowMs();
    const untilNextSecond = 1000 - (((ms % 1000) + 1000) % 1000);
    timer = setTimeout(tick, untilNextSecond);
  };

  function tick() {
    current = clock.nowMs();
    emit();
    schedule();
  }

  const onWake = () => {
    if (document.visibilityState === "hidden") return;
    tick();
  };

  function start() {
    current = clock.nowMs();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pageshow", onWake);
    window.addEventListener("focus", onWake);
    unsubscribeClock = clock.subscribe(tick);
    schedule();
  }

  function stop() {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onWake);
    window.removeEventListener("pageshow", onWake);
    window.removeEventListener("focus", onWake);
    unsubscribeClock?.();
    current = null;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },
    getSnapshot: () => current,
  };
}

const appNowStore = createNowStore(appClock);
const getServerSnapshot = () => null;

/**
 * Current time, re-rendering every second.
 * Returns null on the server and during hydration: render time-dependent
 * values only when this is non-null.
 */
export function useNow(): Date | null {
  const ms = useSyncExternalStore(appNowStore.subscribe, appNowStore.getSnapshot, getServerSnapshot);
  return useMemo(() => (ms === null ? null : new Date(ms)), [ms]);
}

/** Whether the simulated clock is active (false on the server). */
export function useClockSimulated(): boolean {
  return useSyncExternalStore(appClock.subscribe, appClock.isSimulated, () => false);
}
