import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "แผนเที่ยว · ไปต่อ" };

export default function PlanPage() {
  return <PagePlaceholder title="แผนเที่ยว" note="หน้าแผนเที่ยวจะมาในขั้นที่ 6" />;
}
