import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanScreen } from "@/components/plan/PlanScreen";

export const metadata: Metadata = { title: "แผนเที่ยว · ไปต่อ" };

export default function PlanPage() {
  // useSearchParams (?day=) needs a Suspense boundary for static prerendering
  return (
    <Suspense>
      <PlanScreen />
    </Suspense>
  );
}
