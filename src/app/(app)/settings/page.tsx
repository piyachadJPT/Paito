import type { Metadata } from "next";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export const metadata: Metadata = { title: "ตั้งค่า · ไปต่อ" };

export default function SettingsPage() {
  return <SettingsScreen />;
}
