"use client";

import { CalendarDays, CheckCheck, Clock3, MapPinCheck, Navigation, PartyPopper, SkipForward, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyIllustration } from "@/components/ui/EmptyIllustration";
import { SyncStatusPill } from "@/components/sync/SyncStatusPill";
import { useToast } from "@/components/ui/Toast";
import { nowPrefs } from "@/hooks/useNowPrefs";
import { useNowState } from "@/hooks/useNowState";
import { clock } from "@/lib/clock";
import { buildNavUrl } from "@/lib/maps";
import { formatDuration, formatMinutes } from "@/lib/schedule/format";
import { leaveOnPlanKey, type NowState } from "@/lib/schedule/now-state";
import { overstayDeparture, transitDeparture } from "@/lib/schedule/shift";
import type { StatusAction } from "@/lib/schedule/status";
import { MINUTE } from "@/lib/schedule/types";
import { getDayStops } from "@/lib/schedule/util";
import { formatCalendarDate, formatTime, getZonedParts } from "@/lib/time";
import { pressStatus } from "@/services/data/plan-repo";
import { useRepoDeps } from "@/services/data/SyncProvider";
import type { StopRow, TripRow } from "@/services/data/types";
import { AlertBanner } from "./AlertBanner";
import { InfoButton } from "./InfoSheet";
import { NextCard } from "./NextCard";
import { RouteDots } from "./RouteDots";
import { ShiftSheet, type ShiftRequest } from "./ShiftSheet";
import { TodayList } from "./TodayList";

type State = NowState<StopRow>;

/** Card tint by local hour (U3). */
export function tintFor(hour: number): string {
  if (hour >= 5 && hour < 10) return "bg-tint-morning";
  if (hour >= 10 && hour < 16) return "bg-tint-day";
  if (hour >= 16 && hour < 19) return "bg-tint-evening";
  return "bg-tint-night";
}

/** "ตอนนี้" (SPEC §10.3): where am I · where next · when to leave. */
export function NowScreen() {
  const { loading, trip, stops, now, state } = useNowState();
  const repo = useRepoDeps();
  const toast = useToast();
  const [shift, setShift] = useState<ShiftRequest | null>(null);
  const [closeOther, setCloseOther] = useState<{ stop: StopRow; action: StatusAction; otherName: string } | null>(null);

  if (loading) return <NowSkeleton />;
  if (!trip) return <NoTrip />;
  if (!state || !now) return <NowSkeleton />;

  const tz = trip.timezone;
  const nowMs = now.getTime();
  const t = (ms: number | string | null) => (ms === null ? "—" : formatTime(ms, tz));

  async function status(stop: StopRow, action: StatusAction, confirmClose = false) {
    if (!repo) return;
    const dayStops = getDayStops(stops, stop.trip_day_id);
    const { result, undo } = await pressStatus(repo, dayStops, stops, stop.id, action, clock.nowMs(), confirmClose);
    if (!result.ok) {
      setCloseOther({ stop, action, otherName: result.other.name });
      return;
    }
    setCloseOther(null);
    if (undo) toast.showUndo("บันทึกแล้ว", undo);
  }

  const header = state.day ? `Day ${state.day.day_number} · ${formatCalendarDate(state.day.date)}` : trip.name;
  const tint = tintFor(getZonedParts(nowMs, tz).hour);
  const readOnly = !repo;

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {/* 0. small header */}
      <header className="flex min-h-9 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-semibold text-ink-2">{header}</p>
        <SyncStatusPill />
      </header>

      {/* D9: forgot to finish yesterday */}
      {state.staleInProgress && (
        <div className="flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning-soft py-1.5 pr-1.5 pl-3 text-[14px] text-warning-ink">
          <Clock3 aria-hidden size={18} className="shrink-0" />
          <p className="min-w-0 flex-1 font-semibold">ยังเปิด “{state.staleInProgress.name}” ค้างจากเมื่อวาน</p>
          <Button size="md" variant="ghost" disabled={readOnly} onClick={() => void status(state.staleInProgress!, "complete")}>
            ปิดเป็นเสร็จ
          </Button>
        </div>
      )}

      {/* 1. alerts */}
      <AlertBanner alerts={state.alerts} />

      {/* 2–4. main card, next, actions */}
      <StateView
        state={state}
        trip={trip}
        nowMs={nowMs}
        tint={tint}
        t={t}
        readOnly={readOnly}
        onStatus={(s, a) => void status(s, a)}
        onShift={setShift}
      />

      {/* 5. progress (pins along the day's road) */}
      {state.progress && state.progress.total > 0 && (state.kind === "at_stop" || state.kind === "pre_departure" || state.kind === "in_transit") && (
        <section aria-label="ความคืบหน้า" className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-3">
          <RouteDots stops={state.dayStops} progress={state.progress} />
        </section>
      )}

      {/* 6. important info */}
      <InfoButton note={trip.note} />

      {/* 7. today's list */}
      {state.day && <TodayList stops={state.dayStops} dayNumber={state.day.day_number} timeZone={tz} />}

      <ShiftSheet request={shift} dayStops={state.dayStops} timeZone={tz} onClose={() => setShift(null)} />
      <ConfirmDialog
        open={closeOther !== null}
        title={`ปิด “${closeOther?.otherName}” เป็นเสร็จแล้วไหม?`}
        message="กำลังเที่ยวได้ทีละ 1 ที่ ถ้าปิด ระบบจะบันทึกเวลาเสร็จเป็นตอนนี้"
        confirmLabel="ปิดเป็นเสร็จ แล้วไปต่อ"
        onConfirm={() => closeOther && void status(closeOther.stop, closeOther.action, true)}
        onCancel={() => setCloseOther(null)}
      />
    </div>
  );
}

interface ViewProps {
  state: State;
  trip: TripRow;
  nowMs: number;
  tint: string;
  t(ms: number | string | null): string;
  readOnly: boolean;
  onStatus(stop: StopRow, action: StatusAction): void;
  onShift(req: ShiftRequest): void;
}

function Card({ tint, children, label }: { tint: string; children: ReactNode; label: string }) {
  return (
    <section aria-label={label} className={`rounded-[22px] border border-line px-5 pt-3.5 pb-3.5 ${tint}`}>
      {children}
    </section>
  );
}

function Big({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return (
    <p className={`font-[family-name:var(--font-rounded)] text-[52px] leading-[1.05] font-bold tracking-tight tabular-nums ${warn ? "text-warning-ink" : "text-ink"}`}>
      {children}
    </p>
  );
}

function NavLink({ stop, label, variant = "primary", size = "lg", onOpen }: { stop: StopRow; label: string; variant?: "primary" | "secondary"; size?: "lg" | "md"; onOpen?(): void }) {
  // A real link (new tab / Maps app) keeps this page alive while the status write finishes.
  return (
    <a href={buildNavUrl(stop)} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={buttonClasses(variant, size, size === "md" ? "flex-1" : "")}>
      <Navigation aria-hidden size={size === "lg" ? 20 : 18} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function StateView({ state, trip, nowMs, tint, t, readOnly, onStatus, onShift }: ViewProps) {
  const tz = trip.timezone;

  switch (state.kind) {
    case "at_stop": {
      const { current, next, departureAt, departureLeft, activityLeft, lateBy, leavingOnPlan, suggestedShiftMinutes } = state;
      const overdue = departureLeft !== null && departureLeft < 0;
      const late = !leavingOnPlan && !overdue && lateBy !== null && lateBy >= MINUTE;
      const shiftRest = () => onShift({ kind: "fixed", anchor: current, newDeparture: overstayDeparture(current, nowMs) });
      return (
        <>
          <Card tint={tint} label="ตอนนี้">
            <p className="text-[13px] font-semibold text-ink-2">ตอนนี้อยู่ที่</p>
            <h1 className="text-[20px] leading-snug font-semibold">{current.name}</h1>
            <p className="mt-2 text-[14px] text-ink-2">ต้องออกในอีก</p>
            <Big warn={overdue}>{departureLeft === null ? "—" : formatDuration(departureLeft)}</Big>
            <p className="text-[14px] text-ink-2 tabular-nums">ออก {t(departureAt)}</p>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
              <span className="text-[14px] text-ink-2">เวลาเที่ยวเหลือ{leavingOnPlan ? " (ออกตามแผน)" : ""}</span>
              <span className={`text-[24px] font-bold tabular-nums ${activityLeft < 0 ? "text-warning-ink" : ""}`}>{formatDuration(activityLeft)}</span>
            </div>
          </Card>

          {(late || overdue) && (
            <div className="rounded-2xl border border-warning/40 bg-warning-soft px-3 py-2.5 text-warning-ink">
              <p className="flex items-start gap-2 text-[15px] font-semibold">
                <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
                {overdue
                  ? `เลยเวลาออกมา ${formatMinutes(Math.floor(-departureLeft! / MINUTE))}`
                  : `ถ้าเที่ยวครบเวลา จะช้ากว่าแผน ${formatMinutes(Math.floor(lateBy! / MINUTE))}`}
              </p>
              <div className="mt-2 flex gap-2">
                {late && (
                  <Button size="md" variant="secondary" className="shrink-0 px-3 text-[14px]" disabled={readOnly} onClick={() => nowPrefs.leaveOnPlan(leaveOnPlanKey(current))}>
                    ออกตามแผน
                  </Button>
                )}
                <Button size="md" variant="secondary" className="min-w-0 flex-1 px-3 text-[14px] whitespace-nowrap" disabled={readOnly || suggestedShiftMinutes === 0} onClick={shiftRest}>
                  เลื่อนแผนที่เหลือ +{suggestedShiftMinutes} นาที
                </Button>
              </div>
            </div>
          )}

          {next && <NextCard next={next} timeZone={tz} />}

          <div className="flex flex-col gap-2">
            {next ? (
              <NavLink stop={next} label="เสร็จ · นำทางไปต่อ" onOpen={() => !readOnly && onStatus(current, "complete")} />
            ) : (
              <Button icon={<CheckCheck aria-hidden size={20} />} disabled={readOnly} onClick={() => onStatus(current, "complete")}>
                เสร็จ
              </Button>
            )}
            <div className="flex gap-2">
              <Button size="md" variant="secondary" className="flex-1" icon={<Clock3 aria-hidden size={18} />} disabled={readOnly} onClick={() => onShift({ kind: "choose", anchor: current, extendDuration: true })}>
                ปรับเวลา
              </Button>
              <Button size="md" variant="secondary" className="flex-1" icon={<SkipForward aria-hidden size={18} />} disabled={readOnly} onClick={() => onStatus(current, "skip")}>
                ข้าม
              </Button>
            </div>
          </div>
        </>
      );
    }

    case "pre_departure": {
      const { origin, next, departureAt, departureLeft } = state;
      return (
        <>
          <Card tint={tint} label="ตอนนี้">
            <p className="text-[14px] text-ink-2">
              ออกจาก <span className="font-semibold text-ink">{origin.name}</span> ในอีก
            </p>
            <Big>{departureLeft === null ? "—" : formatDuration(departureLeft)}</Big>
            <p className="text-[14px] text-ink-2 tabular-nums">ออก {t(departureAt)}</p>
          </Card>
          {next && <NextCard next={next} timeZone={tz} label="ที่แรกของวัน" />}
          <div className="flex flex-col gap-2">
            {next && <NavLink stop={next} label={`นำทางไป ${next.name}`} />}
            <Button size="md" variant="secondary" icon={<Clock3 aria-hidden size={18} />} disabled={readOnly} onClick={() => onShift({ kind: "choose", anchor: origin, extendDuration: false })}>
              ปรับเวลา
            </Button>
          </div>
        </>
      );
    }

    case "in_transit": {
      const { from, next, eta, lateBy, probablyArrived } = state;
      const late = lateBy !== null && lateBy >= MINUTE;
      return (
        <>
          <Card tint={tint} label="ตอนนี้">
            <p className="text-[14px] text-ink-2">กำลังไป</p>
            <h1 className="mt-0.5 text-[28px] leading-tight font-bold">{next.name}</h1>
            <p className="mt-2 text-[17px] tabular-nums">
              ถึงประมาณ <span className="font-semibold">{t(eta)}</span>
            </p>
            {probablyArrived && <p className="mt-1 text-[14px] font-semibold text-primary">น่าจะถึงแล้ว — กด “ถึงแล้ว”</p>}
          </Card>
          {late && (
            <div className="flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning-soft py-2 pr-2 pl-3 text-warning-ink">
              <TriangleAlert aria-hidden size={18} className="shrink-0" />
              <p className="min-w-0 flex-1 text-[15px] font-semibold">ช้ากว่าแผน {formatMinutes(Math.floor(lateBy! / MINUTE))}</p>
              <Button size="md" variant="secondary" disabled={readOnly} onClick={() => onShift({ kind: "fixed", anchor: from, newDeparture: transitDeparture(from, nowMs) })}>
                เลื่อนแผนที่เหลือ
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button icon={<MapPinCheck aria-hidden size={20} />} disabled={readOnly} onClick={() => onStatus(next, "arrive")}>
              ถึง {next.name} แล้ว
            </Button>
            <div className="flex">
              <NavLink stop={next} label="นำทาง" variant="secondary" size="md" />
            </div>
          </div>
        </>
      );
    }

    case "day_done": {
      const { progress, nextDay, nextOrigin, nextDepartureAt, lodging } = state;
      return (
        <>
          <Card tint={tint} label="ตอนนี้">
            <p className="text-[14px] text-ink-2">{lodging ? `คืนนี้พักที่ ${lodging.name}` : "วันนี้"}</p>
            <h1 className="mt-0.5 text-[30px] leading-tight font-bold">จบวันนี้แล้ว</h1>
            <p className="mt-1 text-[15px] text-ink-2">พักผ่อนให้เต็มที่นะ</p>
            {progress && progress.total > 0 && (
              <p className="mt-3 text-[17px] font-semibold tabular-nums">
                เที่ยว {progress.done} จาก {progress.total} ที่{progress.skipped > 0 && ` · ข้าม ${progress.skipped}`}
              </p>
            )}
            {nextDay && (
              <p className="mt-2 border-t border-line pt-3 text-[17px] tabular-nums">
                พรุ่งนี้ออก <span className="font-bold">{t(nextDepartureAt)}</span> จาก {nextOrigin?.name ?? "—"}
              </p>
            )}
          </Card>
          {nextDay && (
            <Link href={`/plan?day=${nextDay.day_number}`} className={buttonClasses("primary", "lg")}>
              <CalendarDays aria-hidden size={20} />
              ดูแผนพรุ่งนี้
            </Link>
          )}
        </>
      );
    }

    case "before_trip": {
      const { daysUntil, firstDay, firstOrigin, firstDepartureAt } = state;
      return (
        <>
          <Card tint={tint} label="ตอนนี้">
            <p className="text-[17px]">
              อีก <span className="font-[family-name:var(--font-rounded)] text-[56px] leading-none font-bold tabular-nums">{daysUntil}</span> วันถึงทริป
            </p>
            <p className="mt-1 text-[15px] text-ink-2">ใกล้แล้ว เตรียมตัวให้พร้อม</p>
            {firstDay && (
              <p className="mt-3 border-t border-line pt-3 text-[16px] tabular-nums">
                Day 1 ออก <span className="font-bold">{t(firstDepartureAt)}</span> จาก {firstOrigin?.name ?? "—"}
                <span className="block text-[14px] text-ink-2">{formatCalendarDate(firstDay.date)}</span>
              </p>
            )}
          </Card>
          <Link href="/plan?day=1" className={buttonClasses("secondary", "lg")}>
            <CalendarDays aria-hidden size={20} />
            ดูแผนเที่ยว
          </Link>
        </>
      );
    }

    case "after_trip": {
      const { summary } = state;
      return (
        <Card tint={tint} label="ตอนนี้">
          <PartyPopper aria-hidden size={28} className="text-primary" />
          <h1 className="mt-2 text-[30px] leading-tight font-bold">จบทริปแล้ว</h1>
          <p className="mt-1 text-[15px] text-ink-2">กลับถึงบ้านปลอดภัย เก่งมาก</p>
          <p className="mt-3 text-[17px] font-semibold tabular-nums">
            ไป {summary.done} จาก {summary.total} ที่{summary.skipped > 0 && ` · ข้าม ${summary.skipped}`}
          </p>
        </Card>
      );
    }
  }
}

function NoTrip() {
  return (
    <div className="pt-2">
      <header className="flex min-h-9 items-center justify-end">
        <SyncStatusPill />
      </header>
      <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-card px-5 py-6 text-center">
        <EmptyIllustration className="mx-auto w-48" />
        <h1 className="mt-4 text-[20px] font-bold">ยังไม่มีทริป</h1>
        <p className="mt-1 text-[15px] text-ink-2">สร้างทริปหรือนำเข้าไฟล์แผนเที่ยวในหน้าตั้งค่า แล้วกลับมาที่นี่ได้เลย</p>
        <Link href="/settings" className={buttonClasses("primary", "lg", "mt-5")}>
          ไปที่ตั้งค่า
        </Link>
      </div>
    </div>
  );
}

function NowSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 pt-2">
      <div className="h-9 w-48 rounded-full bg-card-sunken" />
      <div className="h-64 rounded-[22px] bg-card-sunken" />
      <div className="h-16 rounded-[var(--radius-card)] bg-card-sunken" />
      <div className="h-14 rounded-2xl bg-card-sunken" />
    </div>
  );
}
