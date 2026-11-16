"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/services/data/db";
import { getMeta } from "@/services/data/local";
import { exportTrip } from "@/services/data/repo";
import type { MetaKey } from "@/services/data/types";

/** Live reads from IndexedDB (SPEC §7). `undefined` = still loading. */

export function useTrips() {
  return useLiveQuery(() => db.trips.toArray().then((t) => t.sort((a, b) => b.start_date.localeCompare(a.start_date))), []);
}

export function useActiveTripId() {
  return useLiveQuery(async () => (await getMeta<string>(db, "activeTripId")) ?? null, []);
}

export function useActiveTrip() {
  return useLiveQuery(async () => {
    const id = await getMeta<string>(db, "activeTripId");
    return (id ? await db.trips.get(id) : undefined) ?? null;
  }, []);
}

export function useOutbox() {
  return useLiveQuery(() => db.outbox.orderBy("seq").toArray(), []);
}

export function useMeta<T>(key: MetaKey) {
  return useLiveQuery(async () => (await getMeta<T>(db, key)) ?? null, [key]);
}

/** Pre-built export of a trip, so "ส่งออก" can share synchronously inside the tap. */
export function useTripExport(tripId: string | null | undefined) {
  return useLiveQuery(async () => (tripId ? exportTrip(db, tripId).catch(() => null) : null), [tripId]);
}
