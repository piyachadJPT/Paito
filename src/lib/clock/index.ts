/**
 * The single source of "now" for the app.
 *
 * Supports a simulated clock for testing. A simulation is stored as an offset
 * anchor ({ simulatedAt, realAt }), so simulated time keeps running in real
 * time — closing the app for 10 minutes advances it by 10 minutes.
 *
 * Kept free of React and DOM globals: storage and the real clock are injected.
 */

import { DEFAULT_TIMEZONE, zonedLocalToUtc } from "@/lib/time";

export const CLOCK_STORAGE_KEY = "paito.clock";
export const NOW_PARAM = "now";

export interface ClockAnchor {
  /** Simulated epoch ms at the moment the simulation was set */
  simulatedAt: number;
  /** Real epoch ms at the same moment */
  realAt: number;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ClockDeps {
  realNow: () => number;
  storage: KeyValueStorage | null;
}

export interface Clock {
  /** Current time (simulated if a simulation is active). */
  now(): Date;
  nowMs(): number;
  isSimulated(): boolean;
  /** Start simulating so that "now" equals `at` right now. */
  setSimulated(at: Date | number): void;
  /** Move simulated time by `deltaMs` (starts a simulation from real time if none). */
  shift(deltaMs: number): void;
  /** Back to the real device clock. */
  reset(): void;
  /**
   * Apply a `?now=` value: "YYYY-MM-DDTHH:MM" in `timeZone` sets the clock,
   * "off" resets it. Returns true if the value was recognised.
   */
  applyNowParam(value: string, timeZone?: string): boolean;
  /** Notified whenever the simulation changes (not on every tick). */
  subscribe(listener: () => void): () => void;
}

export function computeNow(realMs: number, anchor: ClockAnchor | null): number {
  return anchor ? anchor.simulatedAt + (realMs - anchor.realAt) : realMs;
}

export function parseAnchor(raw: string | null): ClockAnchor | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      typeof v === "object" && v !== null &&
      Number.isFinite((v as ClockAnchor).simulatedAt) &&
      Number.isFinite((v as ClockAnchor).realAt)
    ) {
      return { simulatedAt: (v as ClockAnchor).simulatedAt, realAt: (v as ClockAnchor).realAt };
    }
  } catch {
    // corrupt value → treat as no simulation
  }
  return null;
}

export function createClock(deps: ClockDeps): Clock {
  const listeners = new Set<() => void>();
  let anchor: ClockAnchor | null = null;
  let loaded = false;

  function load(): ClockAnchor | null {
    if (!loaded) {
      loaded = true;
      try {
        anchor = parseAnchor(deps.storage?.getItem(CLOCK_STORAGE_KEY) ?? null);
      } catch {
        anchor = null;
      }
    }
    return anchor;
  }

  function save(next: ClockAnchor | null) {
    anchor = next;
    loaded = true;
    try {
      if (next) deps.storage?.setItem(CLOCK_STORAGE_KEY, JSON.stringify(next));
      else deps.storage?.removeItem(CLOCK_STORAGE_KEY);
    } catch {
      // storage unavailable (private mode) → keep in memory only
    }
    listeners.forEach((l) => l());
  }

  const nowMs = () => computeNow(deps.realNow(), load());

  const setSimulated = (at: Date | number) => {
    const simulatedAt = at instanceof Date ? at.getTime() : at;
    if (!Number.isFinite(simulatedAt)) throw new RangeError("Invalid simulated time");
    save({ simulatedAt, realAt: deps.realNow() });
  };

  const reset = () => save(null);

  return {
    nowMs,
    now: () => new Date(nowMs()),
    isSimulated: () => load() !== null,
    setSimulated,
    shift(deltaMs) {
      save({ simulatedAt: nowMs() + deltaMs, realAt: deps.realNow() });
    },
    reset,
    applyNowParam(value, timeZone = DEFAULT_TIMEZONE) {
      const v = value.trim();
      if (v === "off") {
        reset();
        return true;
      }
      let at: Date;
      try {
        at = zonedLocalToUtc(v, timeZone);
      } catch {
        return false;
      }
      setSimulated(at);
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** App-wide clock. Read time only through this (CLAUDE.md: "ตอนนี้" มาจาก lib/clock). */
export const clock: Clock = createClock({
  realNow: () => Date.now(),
  storage: browserStorage(),
});
