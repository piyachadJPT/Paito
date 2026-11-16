"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HandIcon } from "@/components/ui/icons";
import { PaperNote } from "@/components/ui/PaperNote";
import { SyncStatusPill } from "@/components/sync/SyncStatusPill";
import { useToast } from "@/components/ui/Toast";
import { nowPrefs } from "@/hooks/useNowPrefs";
import { useNowState } from "@/hooks/useNowState";
import { clock } from "@/lib/clock";
import { buildNavUrl } from "@/lib/maps";
import { pickScene, type LocalTime, type Scene, type SceneInput } from "@/lib/scene";
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
import { JournalHeader } from "./JournalHeader";
import { NextCard } from "./NextCard";
import { Postcard } from "./Postcard";
import { RouteDots } from "./RouteDots";
import { PostcardScene } from "./scene/PostcardScene";
import { ShiftSheet, type ShiftRequest } from "./ShiftSheet";
import { TodayList } from "./TodayList";

type State = NowState<StopRow>;

/** Late / overdue box (and the alarm sticker on the picture). */
function lateness(state: State): { overdue: boolean; late: boolean } {
  if (state.kind === "at_stop") {
    const overdue = state.departureLeft !== null && state.departureLeft < 0;
    const late = !state.leavingOnPlan && !overdue && state.lateBy !== null && state.lateBy >= MINUTE;
    return { overdue, late };
  }
  if (state.kind === "in_transit") return { overdue: false, late: state.lateBy !== null && state.lateBy >= MINUTE };
  return { overdue: false, late: false };
}

/** The stop the picture is about. */
function sceneStop(state: State): SceneInput["stop"] {
  switch (state.kind) {
    case "at_stop":
      return state.current;
    case "pre_departure":
      return state.origin;
    case "in_transit":
      return state.next;
    case "day_done":
      return state.lodging;
    default:
      return null;
  }
}

/**
 * Picture height shrinks as notes stack up above the card, so sections 0–4
 * stay above the tab bar on a 390×844 screen (D34).
 */
export function pictureHeightFor(notes: number): number {
  return notes === 0 ? 150 : notes === 1 ? 96 : notes === 2 ? 40 : 0;
}

/** "ตอนนี้" (SPEC §10.3): where am I · where next · when to leave — as a journal page. */
export function NowScreen() {
  const { loading, trip, days, stops, now, state } = useNowState();
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

  const readOnly = !repo;
  const { overdue, late } = lateness(state);
  const parts = getZonedParts(nowMs, tz);
  const local: LocalTime = { month: parts.month, day: parts.day, hour: parts.hour };
  const scene = pickScene(
    {
      kind: state.kind,
      stop: sceneStop(state),
      probablyArrived: state.kind === "in_transit" && state.probablyArrived,
      behind: overdue || late,
    },
    local,
  );
  const notes = Number(state.alerts.length > 0) + Number(overdue || late) + Number(state.staleInProgress !== null);

  return (
    <div className="paper-margin -mx-4 flex flex-col gap-2.5 px-4 pt-1 pl-[max(22px,env(safe-area-inset-left))]">
      {/* 0. journal heading */}
      <JournalHeader day={state.day} totalDays={days.length} fallback={trip.name} />

      {/* D9: forgot to finish yesterday */}
      {state.staleInProgress && (
        <PaperNote className="flex items-center gap-2 py-1.5 pr-1.5 pl-3 text-[14px]">
          <HandIcon name="clock" size={18} />
          <p className="min-w-0 flex-1 font-semibold">ยังเปิด “{state.staleInProgress.name}” ค้างจากเมื่อวาน</p>
          <Button size="md" variant="ghost" disabled={readOnly} onClick={() => void status(state.staleInProgress!, "complete")}>
            ปิดเป็นเสร็จ
          </Button>
        </PaperNote>
      )}

      {/* 1. alerts */}
      <AlertBanner alerts={state.alerts} />

      {/* 2–4. postcard, next, actions */}
      <StateView
        state={state}
        trip={trip}
        nowMs={nowMs}
        scene={scene}
        pictureHeight={pictureHeightFor(notes)}
        overdue={overdue}
        late={late}
        t={t}
        readOnly={readOnly}
        onStatus={(s, a) => void status(s, a)}
        onShift={setShift}
      />

      {/* 5. progress (pins along the day's road) */}
      {state.progress && state.progress.total > 0 && (state.kind === "at_stop" || state.kind === "pre_departure" || state.kind === "in_transit") && (
        <section aria-label="ความคืบหน้า" className="px-1">
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
  scene: Scene;
  pictureHeight: number;
  overdue: boolean;
  late: boolean;
  t(ms: number | string | null): string;
  readOnly: boolean;
  onStatus(stop: StopRow, action: StatusAction): void;
  onShift(req: ShiftRequest): void;
}

function Big({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return (
    <p className={`font-[family-name:var(--font-rounded)] text-[52px] leading-[1.05] font-bold tracking-tight tabular-nums ${warn ? "text-warning-ink" : "text-primary"}`}>
      {children}
    </p>
  );
}

function NavLink({ stop, label, variant = "primary", size = "lg", onOpen }: { stop: StopRow; label: string; variant?: "primary" | "secondary"; size?: "lg" | "md"; onOpen?(): void }) {
  // A real link (new tab / Maps app) keeps this page alive while the status write finishes.
  return (
    <a href={buildNavUrl(stop)} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={buttonClasses(variant, size, size === "md" ? "flex-1" : "")}>
      <HandIcon name="navigate" size={size === "lg" ? 22 : 20} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function StateView({ state, trip, nowMs, scene, pictureHeight, overdue, late, t, readOnly, onStatus, onShift }: ViewProps) {
  const tz = trip.timezone;
  // "09:30" for stamps (the full "09:30 น." stays in the card text)
  const hm = (ms: number | string | null) => (ms === null ? "—" : formatTime(ms, tz).replace(" น.", ""));

  switch (state.kind) {
    case "at_stop": {
      const { current, next, departureAt, departureLeft, activityLeft, lateBy, leavingOnPlan, suggestedShiftMinutes } = state;
      const shiftRest = () => onShift({ kind: "fixed", anchor: current, newDeparture: overstayDeparture(current, nowMs) });
      return (
        <>
          <Postcard
            scene={scene}
            pictureHeight={pictureHeight}
            postmark={[current.name, current.started_at ? `ถึง ${hm(current.started_at)}` : undefined]}
            stamp={departureAt !== null ? { label: "ออก", value: hm(departureAt) } : undefined}
          >
            <p className="font-hand text-[13px] font-semibold text-ink-2">ตอนนี้อยู่ที่</p>
            <h2 className="text-[20px] leading-snug font-semibold break-words">{current.name}</h2>
            <p className="mt-2 text-[14px] text-ink-2">ต้องออกในอีก</p>
            <Big warn={overdue}>{departureLeft === null ? "—" : formatDuration(departureLeft)}</Big>
            <p className="text-[14px] text-ink-2 tabular-nums">ออก {t(departureAt)}</p>
            <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-line-strong pt-2">
              <span className="text-[14px] text-ink-2">เวลาเที่ยวเหลือ{leavingOnPlan ? " (ออกตามแผน)" : ""}</span>
              <span className={`text-[24px] font-bold tabular-nums ${activityLeft < 0 ? "text-warning-ink" : ""}`}>{formatDuration(activityLeft)}</span>
            </div>
          </Postcard>

          {(late || overdue) && (
            <PaperNote className="px-3 py-2.5">
              <p className="flex items-start gap-2 text-[15px] font-semibold">
                <HandIcon name="warning" size={18} className="mt-0.5" />
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
            </PaperNote>
          )}

          {next && <NextCard next={next} timeZone={tz} />}

          <div className="flex flex-col gap-2.5">
            {next ? (
              <NavLink stop={next} label="เสร็จ · นำทางไปต่อ" onOpen={() => !readOnly && onStatus(current, "complete")} />
            ) : (
              <Button icon={<HandIcon name="check" size={22} />} disabled={readOnly} onClick={() => onStatus(current, "complete")}>
                เสร็จ
              </Button>
            )}
            <div className="flex gap-2.5">
              <Button size="md" variant="secondary" className="flex-1" icon={<HandIcon name="clock" size={20} />} disabled={readOnly} onClick={() => onShift({ kind: "choose", anchor: current, extendDuration: true })}>
                ปรับเวลา
              </Button>
              <Button size="md" variant="secondary" className="flex-1" icon={<HandIcon name="skip" size={20} />} disabled={readOnly} onClick={() => onStatus(current, "skip")}>
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
          <Postcard scene={scene} pictureHeight={pictureHeight} postmark={[origin.name]} stamp={departureAt !== null ? { label: "ออก", value: hm(departureAt) } : undefined}>
            <p className="text-[14px] text-ink-2">
              ออกจาก <span className="font-semibold text-ink">{origin.name}</span> ในอีก
            </p>
            <Big>{departureLeft === null ? "—" : formatDuration(departureLeft)}</Big>
            <p className="text-[14px] text-ink-2 tabular-nums">ออก {t(departureAt)}</p>
          </Postcard>
          {next && <NextCard next={next} timeZone={tz} label="ที่แรกของวัน" />}
          <div className="flex flex-col gap-2.5">
            {next && <NavLink stop={next} label={`นำทางไป ${next.name}`} />}
            <Button size="md" variant="secondary" icon={<HandIcon name="clock" size={20} />} disabled={readOnly} onClick={() => onShift({ kind: "choose", anchor: origin, extendDuration: false })}>
              ปรับเวลา
            </Button>
          </div>
        </>
      );
    }

    case "in_transit": {
      const { from, next, eta, lateBy, probablyArrived } = state;
      return (
        <>
          <Postcard scene={scene} pictureHeight={pictureHeight} postmark={[next.name]} stamp={eta !== null ? { label: "ถึง", value: `~${hm(eta)}` } : undefined}>
            <p className="text-[14px] text-ink-2">กำลังไป</p>
            <h2 className="mt-0.5 text-[28px] leading-tight font-bold break-words">{next.name}</h2>
            <p className="mt-2 text-[17px] tabular-nums">
              ถึงประมาณ <span className="font-semibold">{t(eta)}</span>
            </p>
            {probablyArrived && <p className="mt-1 text-[14px] font-semibold text-primary">น่าจะถึงแล้ว — กด “ถึงแล้ว”</p>}
          </Postcard>
          {late && (
            <PaperNote className="flex items-center gap-2 py-2 pr-2 pl-3">
              <HandIcon name="warning" size={18} />
              <p className="min-w-0 flex-1 text-[15px] font-semibold">ช้ากว่าแผน {formatMinutes(Math.floor(lateBy! / MINUTE))}</p>
              <Button size="md" variant="secondary" disabled={readOnly} onClick={() => onShift({ kind: "fixed", anchor: from, newDeparture: transitDeparture(from, nowMs) })}>
                เลื่อนแผนที่เหลือ
              </Button>
            </PaperNote>
          )}
          <div className="flex flex-col gap-2.5">
            <Button icon={<HandIcon name="arrive" size={22} />} disabled={readOnly} onClick={() => onStatus(next, "arrive")}>
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
          <Postcard
            scene={scene}
            pictureHeight={pictureHeight}
            postmark={lodging ? [lodging.name] : undefined}
            stamp={nextDay ? { label: "พรุ่งนี้", value: hm(nextDepartureAt) } : undefined}
          >
            <p className="text-[14px] text-ink-2">{lodging ? `คืนนี้พักที่ ${lodging.name}` : "วันนี้"}</p>
            <h2 className="mt-1 font-hand text-[30px] leading-[1.35] font-bold">จบวันนี้แล้ว</h2>
            <p className="mt-1 text-[15px] text-ink-2">พักผ่อนให้เต็มที่นะ</p>
            {progress && progress.total > 0 && (
              <p className="mt-3 text-[17px] font-semibold tabular-nums">
                เที่ยว {progress.done} จาก {progress.total} ที่{progress.skipped > 0 && ` · ข้าม ${progress.skipped}`}
              </p>
            )}
            {nextDay && (
              <p className="mt-2 border-t border-dashed border-line-strong pt-3 text-[17px] tabular-nums">
                พรุ่งนี้ออก <span className="font-bold">{t(nextDepartureAt)}</span> จาก {nextOrigin?.name ?? "—"}
              </p>
            )}
          </Postcard>
          {nextDay && (
            <Link href={`/plan?day=${nextDay.day_number}`} className={buttonClasses("primary", "lg")}>
              <HandIcon name="calendar" size={22} />
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
          <Postcard scene={scene} pictureHeight={pictureHeight} stamp={{ label: "อีก", value: `${daysUntil} วัน` }}>
            <p className="text-[17px]">
              อีก <span className="font-[family-name:var(--font-rounded)] text-[56px] leading-none font-bold text-primary tabular-nums">{daysUntil}</span> วันถึงทริป
            </p>
            <p className="mt-1 font-hand text-[16px] text-ink-2">ใกล้แล้ว เตรียมตัวให้พร้อม</p>
            {firstDay && (
              <p className="mt-3 border-t border-dashed border-line-strong pt-3 text-[16px] tabular-nums">
                Day 1 ออก <span className="font-bold">{t(firstDepartureAt)}</span> จาก {firstOrigin?.name ?? "—"}
                <span className="block text-[14px] text-ink-2">{formatCalendarDate(firstDay.date)}</span>
              </p>
            )}
          </Postcard>
          <Link href="/plan?day=1" className={buttonClasses("secondary", "lg")}>
            <HandIcon name="calendar" size={22} />
            ดูแผนเที่ยว
          </Link>
        </>
      );
    }

    case "after_trip": {
      const { summary } = state;
      return (
        <Postcard scene={scene} pictureHeight={pictureHeight} stamp={{ label: "จบ", value: "ทริป" }}>
          <h2 className="font-hand text-[30px] leading-[1.35] font-bold">จบทริปแล้ว</h2>
          <p className="mt-1 text-[15px] text-ink-2">กลับถึงบ้านปลอดภัย เก่งมาก</p>
          <p className="mt-3 text-[17px] font-semibold tabular-nums">
            ไป {summary.done} จาก {summary.total} ที่{summary.skipped > 0 && ` · ข้าม ${summary.skipped}`}
          </p>
        </Postcard>
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
      <section className="relative mt-4 -rotate-[1.2deg] bg-card p-2.5 pb-6 text-center shadow-[var(--shadow-card)]">
        <PostcardScene scene={{ sky: "day", subject: "empty", extras: [] }} height={150} />
        <h1 className="mt-4 font-hand text-[24px] font-bold">ยังไม่มีทริป</h1>
        <p className="mt-1 px-3 text-[15px] text-ink-2">สร้างทริปหรือนำเข้าไฟล์แผนเที่ยวในหน้าตั้งค่า แล้วกลับมาที่นี่ได้เลย</p>
        <Link href="/settings" className={buttonClasses("primary", "lg", "mx-auto mt-5 max-w-[calc(100%-24px)]")}>
          ไปที่ตั้งค่า
        </Link>
      </section>
    </div>
  );
}

function NowSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 pt-2">
      <div className="h-5 w-40 rounded-full bg-card-sunken" />
      <div className="h-8 w-56 rounded-full bg-card-sunken" />
      <div className="mt-2 -rotate-[1.2deg] bg-card p-2.5 shadow-[var(--shadow-card)]">
        <div className="h-[150px] bg-card-sunken" />
        <div className="mt-3 h-14 w-40 rounded-lg bg-card-sunken" />
      </div>
      <div className="h-14 rounded-2xl bg-card-sunken" />
    </div>
  );
}
