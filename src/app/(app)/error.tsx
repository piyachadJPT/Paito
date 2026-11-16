"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyIllustration } from "@/components/ui/EmptyIllustration";

/** Error state for the tabs: data stays safe in IndexedDB, so retrying is cheap. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-card px-5 py-6 text-center">
      <EmptyIllustration className="mx-auto w-40 opacity-80" />
      <h1 className="mt-4 text-[20px] font-bold">มีบางอย่างผิดพลาด</h1>
      <p className="mt-1 text-[15px] text-ink-2">ข้อมูลในเครื่องยังอยู่ครบ ลองใหม่อีกครั้งได้เลย</p>
      <div className="mt-5 flex flex-col gap-2">
        <Button icon={<RotateCcw aria-hidden size={18} />} onClick={reset}>
          ลองใหม่
        </Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          โหลดหน้าใหม่
        </Button>
      </div>
    </div>
  );
}
