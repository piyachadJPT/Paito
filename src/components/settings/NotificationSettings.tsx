"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { useActiveTripId } from "@/hooks/useLocalData";
import { useNowPrefs } from "@/hooks/useNowPrefs";
import { useOnline } from "@/services/data/SyncProvider";
import { disablePush, enablePush, getPermission, getPushSupport, getSubscription, type PushSupport } from "@/services/push/client";

/** Turn iPhone notifications (Web Push) on/off for this device. */
export function NotificationSettings() {
  const tripId = useActiveTripId() ?? null;
  const { leaveOnPlan } = useNowPrefs();
  const online = useOnline();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const s = getPushSupport();
    (s === "ok" ? getSubscription() : Promise.resolve(null))
      .then((sub) => alive && setEnabled(Boolean(sub) && getPermission() === "granted"))
      .catch(() => undefined)
      .finally(() => alive && setSupport(s));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (next) {
        const result = await enablePush({ tripId, leaveOnPlan: [...leaveOnPlan] });
        if (result === "ok") setEnabled(true);
        else if (result === "denied") setMessage("iPhone ไม่อนุญาตให้แจ้งเตือน เปิดได้ที่ การตั้งค่า › การแจ้งเตือน › ไปต่อ");
        else setMessage("ยังเปิดการแจ้งเตือนไม่ได้ ลองเปิดแอปใหม่อีกครั้ง");
      } else {
        await disablePush();
        setEnabled(false);
      }
    } catch {
      setMessage("บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  const footer =
    message ??
    (support === "needs_install"
      ? "ต้องเพิ่มแอปไว้ที่หน้าจอโฮมก่อน: แตะปุ่มแชร์ใน Safari › เพิ่มไปยังหน้าจอโฮม แล้วเปิดแอปจากไอคอน"
      : support === "unsupported"
        ? "อุปกรณ์นี้ยังไม่รองรับการแจ้งเตือน (ต้องเป็น iOS 16.4 ขึ้นไป)"
        : "เตือนก่อนเวลาออก ตอนถึงเวลาออก และตอนครบเวลาเที่ยว แม้ปิดแอปอยู่ · ไม่เตือนระหว่างขับรถ");

  return (
    <Section title="การแจ้งเตือน" footer={footer}>
      <div className="px-4 py-1.5">
        <Switch
          label="แจ้งเตือนบน iPhone"
          description={enabled && !tripId ? "ยังไม่ได้เลือกทริป" : undefined}
          checked={enabled}
          disabled={support !== "ok" || busy || !online}
          onChange={(next) => void toggle(next)}
        />
      </div>
    </Section>
  );
}
