"use client";

import { useMemo } from "react";
import { getNowState, type NowState } from "@/lib/schedule/now-state";
import type { DayRow, StopRow, TripRow } from "@/services/data/types";
import { useActiveTrip, useTripDays, useTripStops } from "./useLocalData";
import { useNow } from "./useNow";
import { useNowPrefs } from "./useNowPrefs";

export interface NowStateResult {
  /** still reading IndexedDB or before mount */
  loading: boolean;
  trip: TripRow | null;
  days: DayRow[];
  stops: StopRow[];
  now: Date | null;
  state: NowState<StopRow> | null;
}

/**
 * The "ตอนนี้" state, recomputed every second and on returning to the app
 * (useNow). Used by the Now page and the tab-bar alert badge.
 */
export function useNowState(): NowStateResult {
  const trip = useActiveTrip();
  const days = useTripDays(trip?.id);
  const stops = useTripStops(trip?.id);
  const now = useNow();
  const prefs = useNowPrefs();

  const state = useMemo(() => {
    if (!trip || !days || !stops || !now) return null;
    return getNowState(trip, days, stops, now.getTime(), {
      leaveOnPlan: prefs.leaveOnPlan,
      dismissedAlerts: prefs.dismissed,
    });
  }, [trip, days, stops, now, prefs]);

  return {
    loading: trip === undefined || now === null || (trip !== null && (days === undefined || stops === undefined)),
    trip: trip ?? null,
    days: days ?? [],
    stops: stops ?? [],
    now,
    state,
  };
}
