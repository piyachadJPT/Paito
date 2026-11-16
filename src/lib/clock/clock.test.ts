import { describe, expect, it, vi } from "vitest";
import {
  CLOCK_STORAGE_KEY,
  computeNow,
  createClock,
  parseAnchor,
  type KeyValueStorage,
} from ".";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

function setup(initialReal = Date.parse("2026-11-16T03:00:00Z"), storage = memoryStorage()) {
  let real = initialReal;
  const clock = createClock({ realNow: () => real, storage });
  return {
    clock,
    storage,
    advance: (ms: number) => { real += ms; },
  };
}

const MIN = 60_000;

describe("computeNow", () => {
  it("returns real time without a simulation", () => {
    expect(computeNow(1000, null)).toBe(1000);
  });

  it("keeps the simulated offset running", () => {
    expect(computeNow(5000, { simulatedAt: 100_000, realAt: 1000 })).toBe(104_000);
  });
});

describe("parseAnchor", () => {
  it("parses a valid anchor", () => {
    expect(parseAnchor('{"simulatedAt":1,"realAt":2}')).toEqual({ simulatedAt: 1, realAt: 2 });
  });

  it.each([null, "", "not json", "{}", '{"simulatedAt":"x","realAt":2}', "null"])(
    "ignores invalid value %j",
    (raw) => {
      expect(parseAnchor(raw)).toBeNull();
    },
  );
});

describe("createClock", () => {
  it("uses the real clock by default", () => {
    const { clock, advance } = setup();
    expect(clock.isSimulated()).toBe(false);
    expect(clock.now().toISOString()).toBe("2026-11-16T03:00:00.000Z");
    advance(MIN);
    expect(clock.nowMs()).toBe(Date.parse("2026-11-16T03:01:00Z"));
  });

  it("simulated time keeps running with real time (AC-05)", () => {
    const { clock, advance } = setup();
    clock.setSimulated(Date.parse("2026-12-31T00:50:00Z"));
    expect(clock.isSimulated()).toBe(true);
    advance(10 * MIN);
    expect(clock.now().toISOString()).toBe("2026-12-31T01:00:00.000Z");
  });

  it("persists the simulation and restores it in a new instance", () => {
    const storage = memoryStorage();
    const first = setup(1_000_000, storage);
    first.clock.setSimulated(5_000_000);
    expect(JSON.parse(storage.data[CLOCK_STORAGE_KEY])).toEqual({ simulatedAt: 5_000_000, realAt: 1_000_000 });

    // App closed for 10 minutes, then reopened
    const second = setup(1_000_000 + 10 * MIN, storage);
    expect(second.clock.nowMs()).toBe(5_000_000 + 10 * MIN);
  });

  it("shift moves simulated time (and starts a simulation if none)", () => {
    const { clock } = setup(1_000_000);
    clock.shift(15 * MIN);
    expect(clock.isSimulated()).toBe(true);
    expect(clock.nowMs()).toBe(1_000_000 + 15 * MIN);
    clock.shift(60 * MIN);
    expect(clock.nowMs()).toBe(1_000_000 + 75 * MIN);
  });

  it("reset returns to real time and clears storage", () => {
    const { clock, storage } = setup(1_000_000);
    clock.setSimulated(9_000_000);
    clock.reset();
    expect(clock.isSimulated()).toBe(false);
    expect(clock.nowMs()).toBe(1_000_000);
    expect(storage.data[CLOCK_STORAGE_KEY]).toBeUndefined();
  });

  it("rejects an invalid simulated time", () => {
    const { clock } = setup();
    expect(() => clock.setSimulated(Number.NaN)).toThrow(RangeError);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const { clock } = setup();
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    clock.setSimulated(1);
    clock.shift(1);
    clock.reset();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    clock.setSimulated(1);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("works when storage is missing or throws", () => {
    const throwing: KeyValueStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    for (const storage of [null, throwing]) {
      const clock = createClock({ realNow: () => 1000, storage });
      expect(clock.nowMs()).toBe(1000);
      clock.setSimulated(5000);
      expect(clock.nowMs()).toBe(5000);
    }
  });
});

describe("applyNowParam", () => {
  it("interprets ?now= in the trip timezone (Bangkok by default)", () => {
    const { clock } = setup();
    expect(clock.applyNowParam("2026-12-31T07:50")).toBe(true);
    expect(clock.now().toISOString()).toBe("2026-12-31T00:50:00.000Z");
  });

  it("accepts an explicit timezone", () => {
    const { clock } = setup();
    clock.applyNowParam("2027-01-01T09:00", "UTC");
    expect(clock.now().toISOString()).toBe("2027-01-01T09:00:00.000Z");
  });

  it("off resets to real time", () => {
    const { clock } = setup(1000);
    clock.applyNowParam("2026-12-31T07:50");
    expect(clock.applyNowParam("off")).toBe(true);
    expect(clock.isSimulated()).toBe(false);
  });

  it("ignores malformed values without changing the clock", () => {
    const { clock } = setup(1000);
    expect(clock.applyNowParam("tomorrow")).toBe(false);
    expect(clock.isSimulated()).toBe(false);
  });
});
