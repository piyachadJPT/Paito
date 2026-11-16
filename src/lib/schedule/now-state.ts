import { computeDueAlerts, type Alert, type AlertInput } from "./alerts";
import { computeProgress, sumProgress, type Progress } from "./progress";
import { getServiceDate } from "./service-day";
import { MINUTE, type ScheduleDay, type ScheduleStop, type ScheduleTrip } from "./types";
import { ceilTo5Minutes, daysBetween, getDayStops, toMs } from "./util";

export interface NowStateOptions {
  /** Keys from leaveOnPlanKey() of stops where the user chose "ออกตามแผน" */
  leaveOnPlan?: ReadonlySet<string>;
  /** Alert keys the user dismissed */
  dismissedAlerts?: ReadonlySet<string>;
}

interface Common<T extends ScheduleStop> {
  /** Service date of `now` (cut off at day_cutoff_hour) */
  serviceDate: string;
  /** The day shown (null before/after the trip) */
  day: ScheduleDay | null;
  dayStops: T[];
  progress: Progress | null;
  alerts: Alert[];
  /** D9: an in-progress stop belongs to an earlier day than the service date */
  staleInProgress: T | null;
}

export type NowState<T extends ScheduleStop = ScheduleStop> = Common<T> &
  (
    | {
        kind: "before_trip";
        daysUntil: number;
        firstDay: ScheduleDay | null;
        firstOrigin: T | null;
        firstDepartureAt: number | null;
      }
    | {
        kind: "pre_departure";
        origin: T;
        next: T | null;
        departureAt: number | null;
        departureLeft: number | null;
      }
    | {
        kind: "in_transit";
        from: T;
        next: T;
        eta: number | null;
        /** eta − planned arrival (positive = late) */
        lateBy: number | null;
        /** now > eta: "น่าจะถึงแล้ว — กด 'ถึงแล้ว'" */
        probablyArrived: boolean;
      }
    | {
        kind: "at_stop";
        current: T;
        next: T | null;
        /** started_at + duration */
        activityEnd: number;
        /** What the activity countdown counts to (departureAt when leaving on plan) */
        activityTarget: number;
        activityLeft: number;
        leavingOnPlan: boolean;
        departureAt: number | null;
        departureLeft: number | null;
        /** activityEnd − departureAt (positive = staying the full time makes us late) */
        lateBy: number | null;
        /** Minutes for "เลื่อนแผนที่เหลือ +N นาที" (rounded to 5) */
        suggestedShiftMinutes: number;
      }
    | {
        kind: "day_done";
        lodging: T | null;
        nextDay: ScheduleDay | null;
        nextOrigin: T | null;
        nextDepartureAt: number | null;
      }
    | {
        kind: "after_trip";
        summary: Progress;
      }
  );

export function leaveOnPlanKey(stop: Pick<ScheduleStop, "id" | "started_at">): string {
  return `${stop.id}@${stop.started_at ?? ""}`;
}

/**
 * What the "ตอนนี้" screen shows at `now` (SPEC §5.4). Pure: pass `now` in.
 */
export function getNowState<T extends ScheduleStop>(
  trip: ScheduleTrip,
  days: readonly ScheduleDay[],
  stops: readonly T[],
  now: number,
  options: NowStateOptions = {},
): NowState<T> {
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
  const serviceDate = getServiceDate(now, trip.timezone, trip.day_cutoff_hour);
  const inProgress = stops.find((s) => s.status === "in_progress") ?? null;
  const inProgressDay = inProgress ? sortedDays.find((d) => d.id === inProgress.trip_day_id) ?? null : null;
  const staleInProgress = inProgress && inProgressDay && inProgressDay.date < serviceDate ? inProgress : null;

  const base = (day: ScheduleDay | null): Common<T> => {
    const dayStops = day ? getDayStops(stops, day.id) : [];
    return {
      serviceDate,
      day,
      dayStops,
      progress: day ? computeProgress(dayStops.slice(1)) : null,
      alerts: [],
      staleInProgress,
    };
  };

  // 1. Which day
  let day: ScheduleDay | null = inProgressDay;
  if (!day) {
    const first = sortedDays[0];
    const last = sortedDays[sortedDays.length - 1];
    if (!first || serviceDate < first.date) {
      const firstStops = first ? getDayStops(stops, first.id) : [];
      return {
        ...base(null),
        kind: "before_trip",
        daysUntil: daysBetween(serviceDate, first?.date ?? trip.start_date),
        firstDay: first ?? null,
        firstOrigin: firstStops[0] ?? null,
        firstDepartureAt: toMs(firstStops[0]?.planned_departure_at),
      };
    }
    if (serviceDate > last.date) {
      return {
        ...base(null),
        kind: "after_trip",
        summary: sumProgress(sortedDays.map((d) => computeProgress(getDayStops(stops, d.id).slice(1)))),
      };
    }
    day = [...sortedDays].reverse().find((d) => d.date <= serviceDate) ?? first;
  }

  const common = base(day);
  const dayStops = common.dayStops;
  const origin = dayStops[0];
  const rest = dayStops.slice(1);
  const alertMinutes = trip.departure_alert_minutes;
  const dismissed = options.dismissedAlerts;

  const dayDone = (): NowState<T> => {
    const nextDay = sortedDays.find((d) => d.day_number > day.day_number) ?? null;
    const nextOrigin = nextDay ? getDayStops(stops, nextDay.id)[0] ?? null : null;
    const last = dayStops[dayStops.length - 1];
    return {
      ...common,
      kind: "day_done",
      lodging: last && last.stop_type === "lodging" ? last : null,
      nextDay,
      nextOrigin,
      nextDepartureAt: toMs(nextOrigin?.planned_departure_at),
    };
  };

  if (!origin || rest.length === 0) return dayDone();

  // 2a. At a stop
  const current = rest.find((s) => s.status === "in_progress");
  if (current) {
    const currentIndex = rest.indexOf(current);
    const next = rest.slice(currentIndex + 1).find((s) => s.status === "not_started") ?? null;
    const started = toMs(current.started_at) ?? now;
    const activityEnd = started + current.duration_minutes * MINUTE;
    const departureAt = toMs(current.planned_departure_at);
    const leavingOnPlan = Boolean(options.leaveOnPlan?.has(leaveOnPlanKey(current))) && departureAt !== null;
    const activityTarget = leavingOnPlan && departureAt !== null ? departureAt : activityEnd;
    const lateBy = departureAt === null ? null : activityEnd - departureAt;
    const suggestedShiftMinutes =
      departureAt === null ? 0 : Math.max(0, Math.round((ceilTo5Minutes(Math.max(activityEnd, now)) - departureAt) / MINUTE));

    const alertInput: AlertInput = {
      state: "at_stop",
      stopId: current.id,
      stopName: current.name,
      nextName: next?.name ?? null,
      departureAt,
      activityEnd: leavingOnPlan ? null : activityEnd,
      alertMinutes,
    };
    return {
      ...common,
      alerts: computeDueAlerts(alertInput, now, dismissed),
      kind: "at_stop",
      current,
      next,
      activityEnd,
      activityTarget,
      activityLeft: activityTarget - now,
      leavingOnPlan,
      departureAt,
      departureLeft: departureAt === null ? null : departureAt - now,
      lateBy,
      suggestedShiftMinutes,
    };
  }

  // 2b. Nothing left to visit
  if (!rest.some((s) => s.status === "not_started")) return dayDone();

  // 2c. Before leaving the origin
  const originDeparture = toMs(origin.planned_departure_at);
  const untouched = rest.every((s) => s.status === "not_started");
  if (untouched && (originDeparture === null || now < originDeparture)) {
    const next = rest[0];
    return {
      ...common,
      alerts: computeDueAlerts(
        {
          state: "pre_departure",
          stopId: origin.id,
          stopName: origin.name,
          nextName: next?.name ?? null,
          departureAt: originDeparture,
          activityEnd: null,
          alertMinutes,
        },
        now,
        dismissed,
      ),
      kind: "pre_departure",
      origin,
      next,
      departureAt: originDeparture,
      departureLeft: originDeparture === null ? null : originDeparture - now,
    };
  }

  // 2d. On the road (never alerts)
  let fromIndex = -1;
  rest.forEach((s, i) => {
    if (s.status === "completed") fromIndex = i;
  });
  const from = fromIndex >= 0 ? rest[fromIndex] : origin;
  const next =
    rest.slice(fromIndex + 1).find((s) => s.status === "not_started") ?? rest.find((s) => s.status === "not_started")!;
  const leftAt = toMs(from.completed_at) ?? toMs(from.planned_departure_at);
  const eta = leftAt === null ? null : leftAt + (next.travel_minutes ?? 0) * MINUTE;
  const plannedArrival = toMs(next.planned_arrival_at);

  return {
    ...common,
    kind: "in_transit",
    from,
    next,
    eta,
    lateBy: eta === null || plannedArrival === null ? null : eta - plannedArrival,
    probablyArrived: eta !== null && now > eta,
  };
}
