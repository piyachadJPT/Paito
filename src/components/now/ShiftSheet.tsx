"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { clock } from "@/lib/clock";
import { formatMinutes } from "@/lib/schedule/format";
import { delayedDeparture, shiftFrom } from "@/lib/schedule/shift";
import { formatTime } from "@/lib/time";
import { savePlanChange } from "@/services/data/plan-repo";
import { useRepoDeps } from "@/services/data/SyncProvider";
import type { StopRow } from "@/services/data/types";

export type ShiftRequest =
  /** "ปรับเวลา": +15 / +30 / custom from the anchor's planned departure */
  | { kind: "choose"; anchor: StopRow; extendDuration: boolean }
  /** "เลื่อนแผนที่เหลือ": a computed new departure */
  | { kind: "fixed"; anchor: StopRow; newDeparture: number };

type Choice = "15" | "30" | "custom";

/** Shift the rest of the day with a preview before confirming (SPEC §5.3, §10.3). */
export function ShiftSheet({
  request,
  dayStops,
  timeZone,
  onClose,
}: {
  request: ShiftRequest | null;
  dayStops: StopRow[];
  timeZone: string;
  onClose(): void;
}) {
  return (
    <BottomSheet open={request !== null} title={request?.kind === "fixed" ? "เลื่อนแผนที่เหลือ" : "ปรับเวลา"} onClose={onClose}>
      {request && <ShiftBody key={`${request.kind}-${request.anchor.id}`} request={request} dayStops={dayStops} timeZone={timeZone} onClose={onClose} />}
    </BottomSheet>
  );
}

function ShiftBody({
  request,
  dayStops,
  timeZone,
  onClose,
}: {
  request: ShiftRequest;
  dayStops: StopRow[];
  timeZone: string;
  onClose(): void;
}) {
  const repo = useRepoDeps();
  const toast = useToast();
  const [choice, setChoice] = useState<Choice>("15");
  const [custom, setCustom] = useState<number | null>(45);
  const [busy, setBusy] = useState(false);

  const minutes = request.kind === "choose" ? (choice === "custom" ? (custom ?? 0) : Number(choice)) : null;
  const result = useMemo(() => {
    const newDeparture =
      request.kind === "fixed" ? request.newDeparture : delayedDeparture(request.anchor, minutes ?? 0, clock.nowMs());
    return shiftFrom(dayStops, request.anchor.id, newDeparture, {
      extendDuration: request.kind === "choose" && request.extendDuration,
    });
  }, [request, dayStops, minutes]);

  const { lastStop, conflicts, shiftMinutes } = result.preview;
  const anchorDeparture = result.stops.find((s) => s.id === request.anchor.id)?.planned_departure_at ?? null;
  const t = (ms: number | null) => (ms === null ? "—" : formatTime(ms, timeZone));

  async function confirm() {
    if (!repo) return;
    setBusy(true);
    try {
      const undo = await savePlanChange(repo, {
        upserts: result.changed,
        deletes: [],
        undo: { upserts: result.snapshot, deletes: [] },
        conflicts: [],
        gaps: [],
      });
      toast.showUndo(`เลื่อนแผน ${formatMinutes(shiftMinutes)} แล้ว`, undo);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {request.kind === "choose" && (
        <>
          <SegmentedControl<Choice>
            label="เลื่อนเวลาออก"
            options={[
              { value: "15", label: "+15 นาที" },
              { value: "30", label: "+30 นาที" },
              { value: "custom", label: "กำหนดเอง" },
            ]}
            value={choice}
            onChange={setChoice}
          />
          {choice === "custom" && <Stepper label="เลื่อนกี่นาที" value={custom} onChange={setCustom} step={5} min={0} max={600} unit="นาที" />}
        </>
      )}

      <div className="rounded-2xl bg-card-sunken p-4">
        <p className="text-[13px] font-semibold text-ink-2">ถ้าเลื่อน{shiftMinutes > 0 ? ` ${formatMinutes(shiftMinutes)}` : ""}</p>
        <p className="mt-1 text-[15px]">
          ออกจาก {request.anchor.name} <span className="font-semibold tabular-nums">{anchorDeparture ? formatTime(anchorDeparture, timeZone) : "—"}</span>
        </p>
        {lastStop && (
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[17px] font-semibold tabular-nums">
            ถึง {lastStop.name} {t(lastStop.arrivalAt)}
            {lastStop.arrivalAt !== lastStop.previousArrivalAt && (
              <span className="inline-flex items-center gap-1 text-[14px] font-normal text-ink-2">
                <ArrowRight aria-hidden size={13} />
                เดิม {t(lastStop.previousArrivalAt)}
              </span>
            )}
          </p>
        )}
        {conflicts.map((c) => (
          <p key={c.stopId} className="mt-2 flex items-start gap-1.5 text-[14px] font-semibold text-warning-ink">
            <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
            จะถึง {c.name} ช้ากว่าเวลาที่ล็อกไว้ {formatMinutes(c.lateMinutes)}
          </p>
        ))}
        <p className="mt-2 text-[13px] text-ink-2">จุดที่ล็อกเวลาไว้ไม่ขยับ · ไม่เลื่อนข้ามไปวันถัดไป</p>
      </div>

      <Button loading={busy} disabled={!repo || result.changed.length === 0} onClick={() => void confirm()}>
        ยืนยัน
      </Button>
    </div>
  );
}
