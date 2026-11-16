"use client";

import { HandIcon } from "@/components/ui/icons";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Section } from "@/components/ui/PageHeader";
import { TextField } from "@/components/ui/TextField";
import { useTripExport } from "@/hooks/useLocalData";
import { clock } from "@/lib/clock";
import { parseTripFile, type TripFile } from "@/lib/import/import-schema";
import { DEFAULT_TIMEZONE, addDays, formatCalendarDayMonth, formatCalendarDate, toDateKey } from "@/lib/time";
import { db } from "@/services/data/db";
import { createTrip, importTrip, setActiveTrip } from "@/services/data/repo";
import { useRepoDeps } from "@/services/data/SyncProvider";
import type { TripRow } from "@/services/data/types";

/** Switch trips, create, import and export (SPEC §10.5). */
export function TripsManager({ trips, activeId }: { trips: TripRow[]; activeId: string | null }) {
  const active = trips.find((t) => t.id === activeId) ?? null;

  return (
    <Section title="ทริปทั้งหมด" footer="ไฟล์ที่ส่งออกใช้เป็น backup และนำเข้ากลับได้ (รูปแบบเดียวกับ seed-trip.json)">
      {trips.length > 0 && (
        <ul role="radiogroup" aria-label="เลือกทริปที่ใช้อยู่" className="divide-y divide-line">
          {trips.map((t) => {
            const checked = t.id === activeId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => void setActiveTrip(db, t.id)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-card-sunken"
                >
                  {checked ? (
                    <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
                      <HandIcon name="check" size={15} strokeWidth={2.6} />
                    </span>
                  ) : (
                    <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-ink-3" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-medium">{t.name}</span>
                    <span className="block text-[13px] text-ink-2">
                      {formatCalendarDayMonth(t.start_date)} – {formatCalendarDate(t.end_date)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <TripActions active={active} bordered={trips.length > 0} />
    </Section>
  );
}

export function TripActions({ active, bordered = false }: { active: TripRow | null; bordered?: boolean }) {
  const repo = useRepoDeps();
  const [creating, setCreating] = useState(false);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const exportFile = useTripExport(active?.id);

  async function onFile(file: File) {
    setMessage(null);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setImportErrors(["ไฟล์นี้ไม่ใช่ JSON"]);
      return;
    }
    const parsed = parseTripFile(json);
    if (!parsed.ok) {
      setImportErrors(parsed.errors);
      return;
    }
    if (!repo) return;
    await importTrip(repo, parsed.file);
    setMessage(`นำเข้า “${parsed.file.trip.name}” แล้ว`);
  }

  return (
    <div className={`flex flex-col gap-2 p-3 ${bordered ? "border-t border-line" : ""}`}>
      <Button variant="secondary" size="md" icon={<HandIcon name="plus" size={20} />} disabled={!repo} onClick={() => setCreating(true)}>
        สร้างทริปใหม่
      </Button>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          icon={<HandIcon name="upload" size={20} />}
          disabled={!repo}
          onClick={() => fileInput.current?.click()}
        >
          นำเข้าไฟล์
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          icon={<HandIcon name="download" size={20} />}
          disabled={!active || !exportFile}
          onClick={() => active && exportFile && shareOrDownload(exportFile, active)}
        >
          ส่งออกทริปนี้
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
      {message && (
        <p role="status" className="px-1 text-[13px] font-medium text-success">
          {message}
        </p>
      )}

      <CreateTripSheet open={creating} onClose={() => setCreating(false)} />

      <BottomSheet open={importErrors !== null} title="นำเข้าไม่สำเร็จ" onClose={() => setImportErrors(null)}>
        <p className="mt-2 text-[15px] text-ink-2">ไฟล์มีปัญหาตามนี้ แก้แล้วลองใหม่ได้เลย</p>
        <ul className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {importErrors?.slice(0, 12).map((err) => (
            <li key={err} className="rounded-xl bg-warning-soft px-3 py-2 text-[14px] break-words text-warning-ink">
              {err}
            </li>
          ))}
        </ul>
        <Button className="mt-5" onClick={() => setImportErrors(null)}>
          ตกลง
        </Button>
      </BottomSheet>
    </div>
  );
}

/** Must run inside the tap (iOS share sheet needs the user gesture), so the file is pre-built. */
function shareOrDownload(file: TripFile, trip: TripRow) {
  const name = `paito-${trip.start_date}.json`;
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const asFile = new File([blob], name, { type: "application/json" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [asFile] })) {
    navigator.share({ files: [asFile], title: trip.name }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function CreateTripSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const repo = useRepoDeps();
  const today = toDateKey(clock.now(), DEFAULT_TIMEZONE);
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 1));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!repo) return;
    setError(null);
    setBusy(true);
    try {
      await createTrip(repo, { name, start_date: start, end_date: end });
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างทริปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} title="สร้างทริปใหม่" onClose={onClose} locked={busy}>
      <form
        className="mt-4 flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField label="ชื่อทริป" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เที่ยวน่าน 3 วัน" enterKeyHint="next" />
        <DateField
          label="วันเริ่ม"
          value={start}
          onChange={(v) => {
            setStart(v);
            if (v && end < v) setEnd(v);
          }}
        />
        <DateField label="วันจบ" value={end} min={start} onChange={setEnd} />
        {error && (
          <p role="alert" className="text-sm font-medium text-warning-ink">
            {error}
          </p>
        )}
        <p className="text-[13px] text-ink-2">ระบบจะสร้างวันให้ครบ พร้อมจุดออกเดินทาง 08:00 น. ของแต่ละวัน แก้ได้ในหน้าแผนเที่ยว</p>
        <Button type="submit" loading={busy} disabled={!name.trim() || !start || !end}>
          สร้างทริป
        </Button>
      </form>
    </BottomSheet>
  );
}
