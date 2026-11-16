"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextArea } from "@/components/ui/TextArea";
import { formatCalendarDate } from "@/lib/time";
import { updateTrip } from "@/services/data/repo";
import { useRepoDeps } from "@/services/data/SyncProvider";
import type { TripRow } from "@/services/data/types";

const ALERT_OPTIONS = [5, 10, 15, 20, 30].map((m) => ({ value: m, label: `${m}` }));

/** Active trip: read-only facts, important info (note) and alert lead time. */
export function TripSettings({ trip }: { trip: TripRow }) {
  const repo = useRepoDeps();

  return (
    <>
      <Section title="ทริปที่ใช้อยู่">
        <dl className="divide-y divide-line">
          <Row label="ชื่อ" value={trip.name} />
          <Row label="ช่วงวันที่" value={`${formatCalendarDate(trip.start_date)} – ${formatCalendarDate(trip.end_date)}`} />
          <Row label="เขตเวลา" value={trip.timezone} />
        </dl>
      </Section>

      <Section title="ข้อมูลสำคัญ" footer="เลขจอง เบอร์โทรที่พัก ประกันรถ — เปิดดูได้จากหน้า “ตอนนี้” แม้ไม่มีสัญญาณ">
        <div className="p-3">
          <NoteEditor key={trip.id} trip={trip} disabled={!repo} />
        </div>
      </Section>

      <Section title="เตือนก่อนออก (นาที)" footer="ข้อความเตือนจะขึ้นบนหน้า “ตอนนี้” ไม่มีเสียง และไม่เตือนระหว่างขับรถ">
        <div className="p-2">
          <SegmentedControl
            label="เตือนก่อนออกกี่นาที"
            options={ALERT_OPTIONS}
            value={trip.departure_alert_minutes}
            disabled={!repo}
            onChange={(m) => repo && void updateTrip(repo, trip.id, { departure_alert_minutes: m })}
          />
        </div>
      </Section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-12 items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-[15px] text-ink-2">{label}</dt>
      <dd className="text-right text-[15px] font-medium break-words">{value}</dd>
    </div>
  );
}

const SAVE_DELAY_MS = 800;

/** Saves while typing (debounced) and on blur; written locally first, synced later. */
function NoteEditor({ trip, disabled }: { trip: TripRow; disabled: boolean }) {
  const repo = useRepoDeps();
  const [draft, setDraft] = useState(trip.note ?? "");
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const lastSaved = useRef(trip.note ?? "");

  async function save(text: string) {
    window.clearTimeout(timer.current);
    if (!repo || text === lastSaved.current) return;
    lastSaved.current = text;
    await updateTrip(repo, trip.id, { note: text.trim() ? text : null });
    setSaved(true);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div>
      <TextArea
        label="ข้อมูลสำคัญของทริป"
        hideLabel
        value={draft}
        disabled={disabled}
        placeholder={"ที่พัก: ชื่อ / เลขจอง / เบอร์โทร\nประกันรถ: เบอร์โทร"}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          setSaved(false);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => void save(text), SAVE_DELAY_MS);
        }}
        onBlur={() => void save(draft)}
      />
      <p aria-live="polite" className="mt-2 flex h-5 items-center gap-1 px-1 text-[13px] text-success">
        {saved && (
          <>
            <Check aria-hidden size={14} strokeWidth={3} /> บันทึกในเครื่องแล้ว
          </>
        )}
      </p>
    </div>
  );
}
