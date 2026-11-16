import type { Metadata } from "next";
import { AccountSection } from "@/components/settings/AccountSection";

export const metadata: Metadata = { title: "ตั้งค่า · ไปต่อ" };

export default function SettingsPage() {
  return (
    <div className="pt-4">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">ตั้งค่า</h1>
      <p className="mt-2 text-[15px] text-ink-2">ทริป การเตือน และ sync จะมาในขั้นที่ 5</p>
      <div className="mt-6">
        <AccountSection />
      </div>
    </div>
  );
}
