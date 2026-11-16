import { BedDouble, Check, Coffee, Landmark, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { StopStatus, StopType } from "@/lib/schedule/types";

export const STOP_TYPES: { value: StopType; label: string; icon: LucideIcon; color: string; soft: string }[] = [
  { value: "sight", label: "เที่ยว", icon: Landmark, color: "text-type-sight", soft: "bg-type-sight/12" },
  { value: "food", label: "กิน", icon: UtensilsCrossed, color: "text-type-food", soft: "bg-type-food/12" },
  { value: "rest", label: "แวะพัก", icon: Coffee, color: "text-type-rest", soft: "bg-type-rest/15" },
  { value: "lodging", label: "ที่พัก", icon: BedDouble, color: "text-type-lodging", soft: "bg-type-lodging/12" },
];

export function stopTypeMeta(type: StopType) {
  return STOP_TYPES.find((t) => t.value === type)!;
}

/** Type icon in a tinted rounded square. */
export function StopTypeIcon({ type, size = 36 }: { type: StopType; size?: number }) {
  const meta = stopTypeMeta(type);
  const Icon = meta.icon;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-xl ${meta.soft} ${meta.color}`}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}

const STATUS: Record<StopStatus, { label: string; className: string }> = {
  not_started: { label: "ยังไม่เริ่ม", className: "bg-neutral-soft text-ink-2" },
  in_progress: { label: "กำลังเที่ยว", className: "bg-primary-soft text-primary" },
  completed: { label: "เสร็จแล้ว", className: "bg-success-soft text-success" },
  skipped: { label: "ข้าม", className: "bg-neutral-soft text-ink-2" },
};

/** Status chip — always with text, never color alone (SPEC §10.1). */
export function StatusChip({ status }: { status: StopStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold ${s.className}`}>
      {status === "completed" && <Check aria-hidden size={12} strokeWidth={3} />}
      {s.label}
    </span>
  );
}

/** Dot on the timeline line, by status. */
export function statusDotClass(status: StopStatus): string {
  switch (status) {
    case "in_progress":
      return "bg-primary ring-4 ring-primary-soft";
    case "completed":
      return "bg-success";
    case "skipped":
      return "bg-card border-2 border-line-strong";
    default:
      return "bg-card border-2 border-neutral";
  }
}
