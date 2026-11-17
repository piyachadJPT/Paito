import { getNowState } from "@/lib/schedule/now-state";
import { MINUTE, type ScheduleDay, type ScheduleStop, type ScheduleTrip } from "@/lib/schedule/types";
import type { Alert, AlertKind } from "@/lib/schedule/alerts";

export interface PushDevice {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  trip_id: string;
  leave_on_plan: string[];
}

export interface PushPayload {
  title: string;
  body: string;
  /** Same tag replaces an older notification about the same alert */
  tag: string;
  url: string;
}

export type SendResult = "ok" | "gone" | "error";

export interface TickDeps {
  now(): number;
  /** Devices that follow a trip */
  listDevices(): Promise<PushDevice[]>;
  loadTrip(tripId: string): Promise<{ trip: ScheduleTrip; days: ScheduleDay[]; stops: ScheduleStop[] } | null>;
  /** Record that this alert was pushed. false = already pushed before. */
  claim(tripId: string, alertKey: string): Promise<boolean>;
  send(device: PushDevice, payload: PushPayload): Promise<SendResult>;
  removeDevice(id: string): Promise<void>;
}

/** Don't push alerts that became due longer ago than this (e.g. after an outage). */
export const STALE_AFTER = 10 * MINUTE;

const TITLE: Record<AlertKind, string> = {
  departure_soon: "ใกล้เวลาออก",
  departure_now: "ถึงเวลาออก",
  activity_end: "ครบเวลาเที่ยว",
};

export function toPayload(alert: Alert): PushPayload {
  return { title: TITLE[alert.kind], body: alert.message, tag: alert.key, url: "/" };
}

/**
 * One pass of the minute cron: for each followed trip, compute the alerts
 * due now with the same engine as the "ตอนนี้" screen (so nothing is sent
 * while in_transit) and push each alert key once to every device.
 */
export async function runPushTick(deps: TickDeps): Promise<{ trips: number; sent: number }> {
  const now = deps.now();
  const devices = await deps.listDevices();
  const byTrip = new Map<string, PushDevice[]>();
  for (const d of devices) byTrip.set(d.trip_id, [...(byTrip.get(d.trip_id) ?? []), d]);

  let sent = 0;
  for (const [tripId, tripDevices] of byTrip) {
    const data = await deps.loadTrip(tripId);
    if (!data) continue;
    const leaveOnPlan = new Set(tripDevices.flatMap((d) => d.leave_on_plan));
    const state = getNowState(data.trip, data.days, data.stops, now, { leaveOnPlan });

    for (const alert of state.alerts) {
      if (now - alert.dueAt > STALE_AFTER) continue;
      if (!(await deps.claim(tripId, alert.key))) continue;
      const payload = toPayload(alert);
      for (const device of tripDevices) {
        const result = await deps.send(device, payload);
        if (result === "ok") sent++;
        if (result === "gone") await deps.removeDevice(device.id);
      }
    }
  }
  return { trips: byTrip.size, sent };
}
