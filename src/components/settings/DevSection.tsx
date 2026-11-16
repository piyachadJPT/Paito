"use client";

import { HandIcon } from "@/components/ui/icons";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Section } from "@/components/ui/PageHeader";
import { TimeField } from "@/components/ui/TimeField";
import { useClockSimulated, useNow } from "@/hooks/useNow";
import { clock } from "@/lib/clock";
import { DEFAULT_TIMEZONE, formatDate, formatTime, toDateKey, toLocalHHMM, zonedLocalToUtc } from "@/lib/time";

const DEV_KEY = "paito.dev";
const listeners = new Set<() => void>();

function readDev(): boolean {
  try {
    return window.localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDev(on: boolean) {
  try {
    if (on) window.localStorage.setItem(DEV_KEY, "1");
    else window.localStorage.removeItem(DEV_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** ?dev=1 turns the panel on (remembered on this device), ?dev=0 turns it off (SPEC §10.5). */
function useDevMode(): boolean {
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("dev");
    if (param === "1" || param === "0") writeDev(param === "1");
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    readDev,
    () => false,
  );
}

const MIN = 60_000;

/** Developer panel: simulated clock + build version. */
export function DevSection({ timeZone = DEFAULT_TIMEZONE }: { timeZone?: string }) {
  const on = useDevMode();
  const now = useNow();
  const simulated = useClockSimulated();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  if (!on) return null;

  const current = now ? `${formatDate(now, timeZone)} ${formatTime(now, timeZone)}` : "—";

  return (
    <Section title="นักพัฒนา" footer="เปิดด้วย ?dev=1 · ซ่อนด้วย ?dev=0 · เวลาจำลองเดินต่อเองและจำไว้ในเครื่องนี้">
      <div className="flex flex-col gap-4 p-4">
        <p className="flex items-center gap-2 text-[15px]">
          <HandIcon name="flask" size={20} className={simulated ? "text-warning-ink" : "text-ink-2"} />
          <span className="text-ink-2">{simulated ? "นาฬิกาจำลอง" : "เวลาจริง"}</span>
          <span className="font-semibold tabular-nums">{current}</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <DateField label="วันที่" value={date} onChange={setDate} />
          <TimeField label="เวลา" value={time} onChange={setTime} />
        </div>
        <Button
          size="md"
          variant="secondary"
          disabled={!date || !time}
          onClick={() => clock.setSimulated(zonedLocalToUtc(`${date}T${time}`, timeZone))}
        >
          ตั้งเวลาจำลอง
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button size="md" variant="secondary" onClick={() => clock.shift(15 * MIN)}>
            +15 นาที
          </Button>
          <Button size="md" variant="secondary" onClick={() => clock.shift(60 * MIN)}>
            +1 ชม.
          </Button>
          <Button size="md" variant="danger" disabled={!simulated} onClick={() => clock.reset()}>
            รีเซ็ต
          </Button>
        </div>
        <Button
          size="md"
          variant="ghost"
          onClick={() => {
            const n = clock.now();
            setDate(toDateKey(n, timeZone));
            setTime(toLocalHHMM(n, timeZone));
          }}
        >
          ใช้เวลาที่แสดงอยู่เป็นค่าเริ่มต้น
        </Button>

        <dl className="border-t border-line pt-3 text-[13px]">
          <dt className="text-ink-2">เวอร์ชัน build</dt>
          <dd className="font-mono break-all">{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}</dd>
        </dl>
        <Button size="md" variant="ghost" onClick={() => writeDev(false)}>
          ซ่อนแผงนักพัฒนา
        </Button>
      </div>
    </Section>
  );
}
