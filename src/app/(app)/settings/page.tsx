import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "ตั้งค่า · ไปต่อ" };

export default function SettingsPage() {
  return <PagePlaceholder title="ตั้งค่า" note="หน้าตั้งค่าจะมาในขั้นที่ 5" />;
}
