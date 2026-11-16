import { HandIcon, type HandIconName } from "@/components/ui/icons";
import type { StopStatus, StopType } from "@/lib/schedule/types";

export const STOP_TYPES: { value: StopType; label: string; icon: HandIconName; color: string;  }[] = [
  { value: "sight", label: "เที่ยว", icon: "sight", color: "text-type-sight" },
  { value: "food", label: "กิน", icon: "food", color: "text-type-food" },
  { value: "rest", label: "แวะพัก", icon: "rest", color: "text-type-rest" },
  { value: "lodging", label: "ที่พัก", icon: "lodging", color: "text-type-lodging" },
];

export function stopTypeMeta(type: StopType) {
  return STOP_TYPES.find((t) => t.value === type)!;
}

/** Hand-drawn type icon in a tinted rounded square. */
export function StopTypeIcon({ type, size = 36 }: { type: StopType; size?: number }) {
  const meta = stopTypeMeta(type);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-xl ${meta.color}`}
    >
      <HandIcon name={meta.icon} size={Math.round(size * 0.6)} strokeWidth={2} />
    </span>
  );
}

const STATUS: Record<StopStatus, { label: string; className: string }> = {
  not_started: { label: "ยังไม่เริ่ม", className: "bg-neutral-soft text-ink-2" },
  in_progress: { label: "กำลังเที่ยว", className: "bg-primary-soft text-primary" },
  completed: { label: "เสร็จแล้ว", className: "border-[1.5px] border-ink-red/70 text-ink-red -rotate-2" },
  skipped: { label: "ข้าม", className: "bg-neutral-soft text-ink-2" },
};

/** Status chip — always with text, never color alone (SPEC §10.1). */
export function StatusChip({ status }: { status: StopStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold ${s.className}`}>
      {status === "completed" && <HandIcon name="check" size={13} strokeWidth={2.6} />}
      {s.label}
    </span>
  );
}

/**
 * Pin on a journal line (timeline, Now page route): red ink ring with a tick
 * when done, filled blue where you are, dashed when skipped. Decorative —
 * the status is always written next to it.
 */
export function StatusPin({ status }: { status: StopStatus }) {
  switch (status) {
    case "completed":
      return (
        <span aria-hidden className="relative grid size-5 place-items-center rounded-full border-2 border-ink-red bg-card text-ink-red">
          <HandIcon name="check" size={12} strokeWidth={3} />
        </span>
      );
    case "in_progress":
      return <span aria-hidden className="relative block size-4 rounded-full bg-primary ring-4 ring-primary-soft" />;
    case "skipped":
      return <span aria-hidden className="relative block size-4 rounded-full border-2 border-dashed border-ink-3 bg-canvas" />;
    default:
      return <span aria-hidden className="relative block size-4 rounded-full border-2 border-ink-3 bg-canvas" />;
  }
}
