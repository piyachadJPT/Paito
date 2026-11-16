"use client";

import { CloudAlert, CloudOff, CloudUpload, RefreshCw, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOutbox } from "@/hooks/useLocalData";
import { useOnline, useSyncState } from "@/services/data/SyncProvider";

interface PillView {
  label: string;
  icon: LucideIcon;
  tone: "neutral" | "warning" | "primary";
}

export function describeSync(args: { online: boolean; phase: string; pending: number; failed: number }): PillView {
  const { online, phase, pending, failed } = args;
  if (failed > 0) return { label: `ส่งไม่สำเร็จ ${failed}`, icon: CloudAlert, tone: "warning" };
  if (!online || phase === "offline") {
    return pending > 0
      ? { label: `ออฟไลน์ · รอส่ง ${pending}`, icon: CloudOff, tone: "neutral" }
      : { label: "ออฟไลน์", icon: CloudOff, tone: "neutral" };
  }
  if (phase === "auth_required") return { label: "ต้องเข้าสู่ระบบ", icon: CloudAlert, tone: "warning" };
  if (pending > 0) return { label: `รอส่ง ${pending}`, icon: CloudUpload, tone: "primary" };
  if (phase === "syncing") return { label: "กำลัง sync", icon: RefreshCw, tone: "neutral" };
  return { label: "ออนไลน์", icon: Wifi, tone: "neutral" };
}

const TONES = {
  neutral: "bg-card-sunken text-ink-2",
  primary: "bg-primary-soft text-primary",
  warning: "bg-warning-soft text-warning-ink",
} as const;

/** "ออนไลน์ / ออฟไลน์ / รอส่ง 3" for page headers (SPEC §10.3, §7). */
export function SyncStatusPill() {
  const online = useOnline();
  const { phase } = useSyncState();
  const outbox = useOutbox();
  const pending = outbox?.filter((o) => o.status === "pending").length ?? 0;
  const failed = outbox?.filter((o) => o.status === "failed").length ?? 0;
  const view = describeSync({ online, phase, pending, failed });
  const Icon = view.icon;

  return (
    <span
      role="status"
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold tabular-nums ${TONES[view.tone]}`}
    >
      <Icon aria-hidden size={15} strokeWidth={2.4} />
      {view.label}
    </span>
  );
}
