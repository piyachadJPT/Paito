"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { HandIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { Switch } from "@/components/ui/Switch";
import { TextArea } from "@/components/ui/TextArea";
import { TextField } from "@/components/ui/TextField";
import { TimeField } from "@/components/ui/TimeField";
import { useToast } from "@/components/ui/Toast";
import { clock } from "@/lib/clock";
import { parseLocationInput } from "@/lib/maps";
import { canMove, editStop, moveStop, moveStopToDay, removeStop } from "@/lib/schedule/plan-edit";
import { availableActions, type StatusAction } from "@/lib/schedule/status";
import { getDayStops } from "@/lib/schedule/util";
import { dayTimeToUtc, formatCalendarDayMonth, formatTime, toLocalHHMM } from "@/lib/time";
import { pressStatus, savePlanChange } from "@/services/data/plan-repo";
import { useRepoDeps } from "@/services/data/SyncProvider";
import type { DayRow, StopRow, TripRow } from "@/services/data/types";
import { STOP_TYPES, StopTypeIcon } from "./stop-visuals";

interface Props {
  trip: TripRow;
  day: DayRow;
  days: DayRow[];
  tripStops: StopRow[];
  stopId: string | null;
  onClose(): void;
}

/** Bottom sheet to edit one stop (SPEC §10.4). Keyed by stop id by the parent. */
export function StopEditorSheet(props: Props) {
  const dayStops = getDayStops(props.tripStops, props.day.id);
  const stop = dayStops.find((s) => s.id === props.stopId) ?? null;
  return (
    <BottomSheet open={stop !== null} title={stop ? (dayStops[0]?.id === stop.id ? "จุดออกเดินทาง" : "แก้ไขสถานที่") : ""} onClose={props.onClose}>
      {stop && <EditorBody key={stop.id} {...props} stop={stop} dayStops={dayStops} />}
    </BottomSheet>
  );
}

function locationText(s: StopRow): string {
  if (s.maps_url) return s.maps_url;
  if (s.latitude !== null && s.longitude !== null) return `${s.latitude}, ${s.longitude}`;
  return s.maps_query ?? "";
}

function locationHint(text: string): string {
  const loc = parseLocationInput(text);
  if (loc.latitude !== null) return `พิกัด ${loc.latitude.toFixed(5)}, ${loc.longitude!.toFixed(5)}`;
  if (loc.maps_url) return "ลิงก์ Google Maps (เปิดลิงก์นี้ตอนนำทาง)";
  if (loc.maps_query) return `ค้นหาใน Google Maps: “${loc.maps_query}”`;
  return "ว่างไว้ได้ — จะค้นหาด้วยชื่อสถานที่";
}

const ACTION_LABEL: Record<StatusAction, string> = {
  arrive: "ถึงแล้ว",
  complete: "เสร็จ",
  skip: "ข้าม",
  revert: "ย้อนสถานะ",
};

function EditorBody({ trip, day, days, tripStops, stop, dayStops, onClose }: Props & { stop: StopRow; dayStops: StopRow[] }) {
  const repo = useRepoDeps();
  const toast = useToast();
  const tz = trip.timezone;
  const index = dayStops.findIndex((s) => s.id === stop.id);
  const isOrigin = index === 0;
  const isLast = !isOrigin && index === dayStops.length - 1;
  // tonight's bed: the day ends here, so there is no departure to show
  const overnight = isLast && stop.stop_type === "lodging";
  const readOnly = !repo;

  const [name, setName] = useState(stop.name);
  const [type, setType] = useState(stop.stop_type);
  const [location, setLocation] = useState(locationText(stop));
  const [duration, setDuration] = useState<number | null>(stop.duration_minutes);
  const [travel, setTravel] = useState<number | null>(stop.travel_minutes);
  const [fixed, setFixed] = useState(stop.is_fixed);
  const [fixedTime, setFixedTime] = useState(stop.planned_arrival_at ? toLocalHHMM(stop.planned_arrival_at, tz) : "");
  const [departTime, setDepartTime] = useState(stop.planned_departure_at ? toLocalHHMM(stop.planned_departure_at, tz) : "");
  const [note, setNote] = useState(stop.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [closeOther, setCloseOther] = useState<{ action: StatusAction; name: string } | null>(null);
  const [choosingDay, setChoosingDay] = useState(false);

  const toUtc = (hhmm: string) => dayTimeToUtc(day.date, hhmm, trip.day_cutoff_hour, tz).toISOString();

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  function draftRow(overrides: Partial<StopRow> = {}): StopRow {
    const loc = parseLocationInput(location);
    return {
      ...stop,
      name: name.trim() || stop.name,
      stop_type: isOrigin ? "lodging" : type,
      ...loc,
      duration_minutes: duration ?? 0,
      travel_minutes: travel,
      is_fixed: !isOrigin && fixed && Boolean(fixedTime),
      planned_arrival_at: !isOrigin && fixed && fixedTime ? toUtc(fixedTime) : stop.planned_arrival_at,
      planned_departure_at: isOrigin && departTime ? toUtc(departTime) : stop.planned_departure_at,
      note: note.trim() ? note : null,
      ...overrides,
    };
  }

  const save = (overrides: Partial<StopRow> = {}, message = "คำนวณเวลาใหม่แล้ว") =>
    run(async () => {
      if (!repo) return;
      const undo = await savePlanChange(repo, editStop(dayStops, draftRow(overrides)));
      toast.showUndo(message, undo);
      onClose();
    });

  const status = (action: StatusAction, confirmClose = false) =>
    run(async () => {
      if (!repo) return;
      const { result, undo } = await pressStatus(repo, dayStops, tripStops, stop.id, action, clock.nowMs(), confirmClose);
      if (!result.ok) {
        setCloseOther({ action, name: result.other.name });
        return;
      }
      setCloseOther(null);
      if (undo) toast.showUndo("บันทึกแล้ว", undo);
      onClose();
    });

  const move = (direction: -1 | 1) =>
    run(async () => {
      if (!repo) return;
      const undo = await savePlanChange(repo, moveStop(dayStops, stop.id, direction));
      toast.showUndo("ย้ายแล้ว · คำนวณเวลาใหม่", undo);
    });

  const moveToDay = (target: DayRow) =>
    run(async () => {
      if (!repo) return;
      const targetStops = getDayStops(tripStops, target.id);
      const undo = await savePlanChange(repo, moveStopToDay(dayStops, targetStops, stop.id, target.id));
      toast.showUndo(`ย้ายไป Day ${target.day_number} แล้ว`, undo);
      setChoosingDay(false);
      onClose();
    });

  const remove = () =>
    run(async () => {
      if (!repo) return;
      const undo = await savePlanChange(repo, removeStop(dayStops, stop.id));
      toast.showUndo(`ลบ “${stop.name}” แล้ว`, undo);
      setConfirmDelete(false);
      onClose();
    });

  const actions = availableActions(stop, isOrigin);

  return (
    <div className="mt-4 flex flex-col gap-5 pb-2">
      {readOnly && <p className="rotate-[0.4deg] rounded-[4px] bg-primary-soft px-3 py-2 text-[14px]">ดูได้อย่างเดียว · เข้าสู่ระบบอีกครั้งเพื่อแก้ไข</p>}

      {/* computed times (read-only) */}
      {!isOrigin && (
        <p className="flex items-center gap-2 rounded-[6px] border-[1.5px] border-dashed border-line-strong px-3 py-2.5 text-[15px] tabular-nums">
          <span className="font-hand text-[16px] font-bold text-ink-2">ตามแผน</span>
          <span className="font-semibold">
            ถึง {stop.planned_arrival_at ? formatTime(stop.planned_arrival_at, tz) : "—"} ·{" "}
            {overnight ? "นอนที่นี่" : `ออก ${stop.planned_departure_at ? formatTime(stop.planned_departure_at, tz) : "—"}`}
          </span>
        </p>
      )}

      {isLast && !overnight && (
        <Button
          size="md"
          variant="secondary"
          icon={<HandIcon name="lodging" size={20} />}
          disabled={readOnly || busy}
          onClick={() => void save({ stop_type: "lodging" }, "คืนนี้นอนที่นี่")}
        >
          นอนที่นี่
        </Button>
      )}

      {actions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <Button
              key={a}
              size="md"
              variant={a === "arrive" || a === "complete" ? "primary" : "secondary"}
              disabled={readOnly || busy}
              icon={
                <HandIcon name={a === "arrive" ? "arrive" : a === "complete" ? "check" : a === "skip" ? "skip" : "undo"} size={20} />
              }
              onClick={() => void status(a)}
            >
              {ACTION_LABEL[a]}
            </Button>
          ))}
        </div>
      )}

      <TextField label="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />

      {!isOrigin && (
        <div>
          <p className="mb-2 font-hand text-[16px] font-bold text-ink-2">ประเภท</p>
          <SegmentedControl<StopRow["stop_type"]>
            label="ประเภทสถานที่"
            options={STOP_TYPES.map((t) => ({ value: t.value, label: t.label, icon: <StopTypeIcon type={t.value} size={30} /> }))}
            value={type}
            onChange={setType}
            disabled={readOnly}
          />
        </div>
      )}

      <TextField
        label="ตำแหน่ง"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="วางลิงก์ Google Maps, พิกัด หรือพิมพ์ชื่อ"
        hint={locationHint(location)}
        autoCapitalize="none"
        autoCorrect="off"
        disabled={readOnly}
      />

      {isOrigin ? (
        <TimeField label="เวลาออกเดินทาง" value={departTime} onChange={setDepartTime} disabled={readOnly} />
      ) : (
        <>
          <Stepper label="อยู่นาน" value={duration} onChange={setDuration} step={15} unit="นาที" disabled={readOnly} />
          <div>
            <Stepper
              label="เวลาขับจากจุดก่อน"
              value={travel}
              onChange={setTravel}
              step={5}
              unit="นาที"
              emptyText="ยังไม่กรอก"
              disabled={readOnly}
            />
            {stop.travel_needs_review && travel === stop.travel_minutes && travel !== null && (
              <div className="mt-2 flex rotate-[0.4deg] items-center gap-2 rounded-[4px] border border-warning/30 bg-warning-soft px-3 py-1.5 text-[14px] text-warning-ink">
                <span className="flex-1">จุดก่อนหน้าเปลี่ยน ตรวจเวลาขับอีกครั้ง</span>
                <Button size="md" variant="ghost" disabled={readOnly || busy} icon={<HandIcon name="check" size={18} />} onClick={() => void save({ travel_needs_review: false }, "ยืนยันเวลาขับแล้ว")}>
                  ถูกต้อง
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-[8px] border-[1.5px] border-dashed border-line-strong px-4 py-2">
            <Switch
              label="ล็อกเวลาถึง"
              description="เช่น งานที่เริ่มตรงเวลา เลื่อนแผนแล้วจุดนี้จะไม่ขยับ"
              checked={fixed}
              onChange={(v) => {
                setFixed(v);
                if (v && !fixedTime && stop.planned_arrival_at) setFixedTime(toLocalHHMM(stop.planned_arrival_at, tz));
              }}
              disabled={readOnly}
            />
            {fixed && (
              <div className="pt-2 pb-2">
                <TimeField
                  label="ต้องถึงเวลา"
                  value={fixedTime}
                  onChange={setFixedTime}
                  disabled={readOnly}
                  hint={`ก่อน ${String(trip.day_cutoff_hour).padStart(2, "0")}:00 น. นับเป็นคืนของวันนี้`}
                />
              </div>
            )}
          </div>
        </>
      )}

      <TextArea label="โน้ต" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ที่จอดรถ ค่าเข้า สิ่งที่ต้องเตรียม" disabled={readOnly} />

      <Button loading={busy} disabled={readOnly} onClick={() => void save()}>
        บันทึก
      </Button>

      {!isOrigin && (
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-line-strong pt-4">
          <p className="font-hand text-[16px] font-bold text-ink-2">จัดลำดับ</p>
          <div className="grid grid-cols-3 gap-2">
            <Button size="md" variant="secondary" icon={<HandIcon name="up" size={20} />} disabled={readOnly || busy || !canMove(dayStops, stop.id, -1)} onClick={() => void move(-1)}>
              ขึ้น
            </Button>
            <Button size="md" variant="secondary" icon={<HandIcon name="down" size={20} />} disabled={readOnly || busy || !canMove(dayStops, stop.id, 1)} onClick={() => void move(1)}>
              ลง
            </Button>
            <Button size="md" variant="secondary" icon={<HandIcon name="calendar" size={20} />} disabled={readOnly || busy || days.length < 2} onClick={() => setChoosingDay(true)}>
              ย้ายวัน
            </Button>
          </div>
          <Button size="md" variant="danger" className="mt-2" icon={<HandIcon name="trash" size={20} />} disabled={readOnly || busy} onClick={() => setConfirmDelete(true)}>
            ลบสถานที่นี้
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`ลบ “${stop.name}”?`}
        message="เวลาของจุดถัดไปจะคำนวณใหม่ กด “ย้อนกลับ” ได้ภายใน 8 วินาที"
        confirmLabel="ลบ"
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={closeOther !== null}
        title={`ปิด “${closeOther?.name}” เป็นเสร็จแล้วไหม?`}
        message="กำลังเที่ยวได้ทีละ 1 ที่ ถ้าปิด ระบบจะบันทึกเวลาเสร็จเป็นตอนนี้"
        confirmLabel="ปิดเป็นเสร็จ แล้วไปต่อ"
        busy={busy}
        onConfirm={() => closeOther && void status(closeOther.action, true)}
        onCancel={() => setCloseOther(null)}
      />

      <BottomSheet open={choosingDay} title="ย้ายไปวันไหน" onClose={() => setChoosingDay(false)} locked={busy}>
        <ul className="mt-3 flex flex-col gap-2">
          {days
            .filter((d) => d.id !== day.id)
            .map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void moveToDay(d)}
                  className="relative flex min-h-14 w-full items-center gap-3 rounded-[5px] bg-card px-4 text-left shadow-[0_2px_6px_rgb(60_40_10/0.14)] active:bg-card-sunken"
                >
                  <span className="font-hand text-[18px] font-bold text-primary">D{d.day_number}</span>
                  <span className="text-[15px] text-ink-2">{formatCalendarDayMonth(d.date)}</span>
                  {d.title && <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{d.title}</span>}
                </button>
              </li>
            ))}
        </ul>
        <p className="mt-3 text-[13px] text-ink-2">จะวางไว้ก่อนที่พักท้ายวันของวันนั้น</p>
      </BottomSheet>
    </div>
  );
}
