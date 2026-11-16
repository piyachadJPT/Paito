"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-device choices that are not synced (SPEC §5.4, §6):
 * - leaveOnPlan:  stops where the user chose "ออกตามแผน" (key = stopId@started_at)
 * - dismissed:    alert keys the user closed (key = trigger:stopId:target)
 */
export interface NowPrefs {
  leaveOnPlan: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
}

const KEYS = { leaveOnPlan: "paito.leaveOnPlan", dismissed: "paito.dismissedAlerts" } as const;
const MAX_ENTRIES = 300;
const EMPTY: NowPrefs = { leaveOnPlan: new Set(), dismissed: new Set() };

let cache: NowPrefs | null = null;
const listeners = new Set<() => void>();

function read(key: string): Set<string> {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function snapshot(): NowPrefs {
  if (!cache) cache = { leaveOnPlan: read(KEYS.leaveOnPlan), dismissed: read(KEYS.dismissed) };
  return cache;
}

function add(which: keyof NowPrefs, value: string) {
  const current = snapshot();
  if (current[which].has(value)) return;
  const next = [...current[which], value].slice(-MAX_ENTRIES);
  try {
    window.localStorage.setItem(KEYS[which], JSON.stringify(next));
  } catch {
    // storage blocked: keep in memory for this session
  }
  cache = { ...current, [which]: new Set(next) };
  listeners.forEach((l) => l());
}

export const nowPrefs = {
  leaveOnPlan: (key: string) => add("leaveOnPlan", key),
  dismissAlert: (key: string) => add("dismissed", key),
};

export function useNowPrefs(): NowPrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    snapshot,
    () => EMPTY,
  );
}
