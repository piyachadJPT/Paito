import { formatMinutes } from "./format";
import { MINUTE } from "./types";
import { toIso } from "./util";

export type AlertKind = "departure_soon" | "departure_now" | "activity_end";

export interface Alert {
  /** trigger + stopId + targetTime — remember dismissals by this */
  key: string;
  kind: AlertKind;
  stopId: string;
  /** The departure / activity-end time the alert is about */
  targetAt: number;
  /** When the alert became due */
  dueAt: number;
  message: string;
}

export interface AlertInput {
  /** Only these states alert; in_transit never does (driving safety) */
  state: "pre_departure" | "at_stop";
  /** Stop we are leaving (origin or current) */
  stopId: string;
  stopName: string;
  nextName: string | null;
  departureAt: number | null;
  /** at_stop only, and only when not "leaving on plan" */
  activityEnd: number | null;
  alertMinutes: number;
}

export function alertKey(kind: AlertKind, stopId: string, targetAt: number): string {
  return `${kind}:${stopId}:${toIso(targetAt)}`;
}

/**
 * Alerts due at `now` (SPEC §6, D5). Of several due alerts for the same stop,
 * only the latest one is returned; then dismissed keys are removed. Messages
 * are computed live, so a missed alert reads "เลยเวลาออกมา 7 นาที".
 */
export function computeDueAlerts(
  input: AlertInput | null,
  now: number,
  dismissed: ReadonlySet<string> = new Set(),
): Alert[] {
  if (!input) return [];
  const { stopId, stopName, nextName, departureAt, activityEnd, alertMinutes } = input;
  const due: Alert[] = [];
  const toNext = nextName ? `ไป ${nextName}` : "";

  if (departureAt !== null) {
    const soonAt = departureAt - alertMinutes * MINUTE;
    if (alertMinutes > 0 && now >= soonAt && now < departureAt) {
      const left = Math.floor((departureAt - now) / MINUTE);
      due.push({
        key: alertKey("departure_soon", stopId, departureAt),
        kind: "departure_soon",
        stopId,
        targetAt: departureAt,
        dueAt: soonAt,
        message: left >= 1 ? `อีก ${formatMinutes(left)}ต้องออก${toNext}` : `อีกไม่ถึง 1 นาทีต้องออก${toNext}`,
      });
    }
    if (now >= departureAt) {
      const late = Math.floor((now - departureAt) / MINUTE);
      due.push({
        key: alertKey("departure_now", stopId, departureAt),
        kind: "departure_now",
        stopId,
        targetAt: departureAt,
        dueAt: departureAt,
        message:
          late >= 1
            ? `เลยเวลาออกมา ${formatMinutes(late)}${nextName ? ` · ต่อไป ${nextName}` : ""}`
            : `ถึงเวลาออก${nextName ? `ไป ${nextName} ` : ""}แล้ว`,
      });
    }
  }

  if (input.state === "at_stop" && activityEnd !== null && now >= activityEnd) {
    const late = Math.floor((now - activityEnd) / MINUTE);
    due.push({
      key: alertKey("activity_end", stopId, activityEnd),
      kind: "activity_end",
      stopId,
      targetAt: activityEnd,
      dueAt: activityEnd,
      message: late >= 1 ? `ครบเวลาเที่ยวที่ ${stopName} แล้ว (เลยมา ${formatMinutes(late)})` : `ครบเวลาเที่ยวที่ ${stopName} แล้ว`,
    });
  }

  if (due.length === 0) return [];
  const latest = due.reduce((a, b) => (b.dueAt >= a.dueAt ? b : a));
  return dismissed.has(latest.key) ? [] : [latest];
}
