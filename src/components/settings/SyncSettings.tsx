"use client";

import { HandIcon } from "@/components/ui/icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/PageHeader";
import { useMeta, useOutbox } from "@/hooks/useLocalData";
import { formatTime, DEFAULT_TIMEZONE, formatDayMonth } from "@/lib/time";
import { useOnline, useSyncEngine, useSyncState } from "@/services/data/SyncProvider";
import type { OutboxOp } from "@/services/data/types";

const TABLE_LABEL: Record<OutboxOp["table"], string> = {
  trips: "ทริป",
  trip_days: "วัน",
  trip_stops: "สถานที่",
};

/** Sync status, queued / failed writes and "sync ตอนนี้" (SPEC §7, §10.5). */
export function SyncSettings({ timeZone = DEFAULT_TIMEZONE }: { timeZone?: string }) {
  const engine = useSyncEngine();
  const { phase, lastError } = useSyncState();
  const online = useOnline();
  const outbox = useOutbox() ?? [];
  const lastSyncedAt = useMeta<number>("lastSyncedAt");
  const [busy, setBusy] = useState(false);

  const pending = outbox.filter((o) => o.status === "pending");
  const failed = outbox.filter((o) => o.status === "failed");
  const last = lastSyncedAt ? `${formatDayMonth(lastSyncedAt, timeZone)} ${formatTime(lastSyncedAt, timeZone)}` : "ยังไม่เคย";

  const statusText = !online || phase === "offline" ? `ออฟไลน์ · อัปเดตล่าสุด ${last}` : phase === "syncing" ? "กำลัง sync…" : phase === "auth_required" ? "ต้องเข้าสู่ระบบอีกครั้งก่อน sync" : `ออนไลน์ · อัปเดตล่าสุด ${last}`;

  return (
    <Section title="Sync" footer={lastError && phase !== "idle" ? `ปัญหาล่าสุด: ${lastError}` : undefined}>
      <div className="flex flex-col gap-1 px-4 py-3">
        <p className="text-[15px] font-medium">{statusText}</p>
        <p className="text-[13px] text-ink-2 tabular-nums">
          {pending.length > 0 ? `รอส่ง ${pending.length} รายการ` : "ไม่มีรายการรอส่ง"}
          {failed.length > 0 && ` · ส่งไม่สำเร็จ ${failed.length}`}
        </p>
      </div>

      {failed.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {failed.map((op) => (
            <li key={op.id} className="px-4 py-3">
              <p className="text-[15px] font-medium">
                {op.op === "delete" ? "ลบ" : "บันทึก"}
                {TABLE_LABEL[op.table]} {op.rowIds.length} รายการ
              </p>
              <p className="mt-0.5 text-[13px] break-words text-warning-ink">{op.lastError}</p>
              <div className="mt-2 flex gap-2">
                <Button size="md" variant="secondary" icon={<HandIcon name="undo" size={18} />} disabled={!engine} onClick={() => engine && void engine.retry(op.id)}>
                  ลองอีกครั้ง
                </Button>
                <Button size="md" variant="danger" icon={<HandIcon name="trash" size={18} />} disabled={!engine} onClick={() => engine && void engine.discard(op.id)}>
                  ทิ้ง
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line p-3">
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          icon={<HandIcon name="refresh" size={20} />}
          loading={busy}
          disabled={!engine}
          onClick={async () => {
            if (!engine) return;
            setBusy(true);
            await engine.sync({ force: true });
            setBusy(false);
          }}
        >
          sync ตอนนี้
        </Button>
      </div>
    </Section>
  );
}
