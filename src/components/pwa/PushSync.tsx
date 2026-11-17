"use client";

import { useEffect } from "react";
import { useActiveTripId } from "@/hooks/useLocalData";
import { useNowPrefs } from "@/hooks/useNowPrefs";
import { useOnline } from "@/services/data/SyncProvider";
import { syncDevice } from "@/services/push/client";

/**
 * Tells the push server which trip this device follows and which stops are
 * "ออกตามแผน", whenever they change or the device comes back online.
 * Does nothing when the device has no push subscription.
 */
export function PushSync() {
  const tripId = useActiveTripId();
  const { leaveOnPlan } = useNowPrefs();
  const online = useOnline();

  useEffect(() => {
    if (tripId === undefined || !online) return;
    syncDevice({ tripId, leaveOnPlan: [...leaveOnPlan] }).catch(() => undefined); // retried on next change/online
  }, [tripId, leaveOnPlan, online]);

  return null;
}
