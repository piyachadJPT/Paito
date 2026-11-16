"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/services/auth/AuthProvider";

/** Shown when the session is gone but local data is still viewable (read-only). */
export function ReauthBanner() {
  const { readOnly } = useAuth();
  if (!readOnly) return null;

  return (
    <div
      role="status"
      className="mx-4 mt-2 flex min-h-11 items-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft py-1.5 pr-1.5 pl-3 text-sm text-ink"
    >
      <KeyRound aria-hidden size={18} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 leading-tight">ดูได้อย่างเดียว · เข้าสู่ระบบอีกครั้งเพื่อแก้ไขและ sync</p>
      <Link
        href="/login"
        className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 font-semibold text-primary active:bg-primary/15"
      >
        เข้าสู่ระบบอีกครั้ง
      </Link>
    </div>
  );
}
