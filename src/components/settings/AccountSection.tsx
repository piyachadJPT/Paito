"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/services/auth/AuthProvider";

export function AccountSection() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    setBusy(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section aria-labelledby="account-heading">
      <h2 id="account-heading" className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-ink-2">
        บัญชี
      </h2>
      <div className="rounded-[var(--radius-card)] border border-line bg-card">
        <div className="flex min-h-14 items-center gap-3 px-4">
          <UserRound aria-hidden size={20} className="shrink-0 text-ink-2" />
          <span className="min-w-0 flex-1 truncate text-[17px]">{user?.email ?? "—"}</span>
        </div>
        <div className="border-t border-line p-2">
          <Button variant="danger" size="md" className="w-full" icon={<LogOut aria-hidden size={18} />} onClick={() => setConfirming(true)}>
            ออกจากระบบ
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="ออกจากระบบ?"
        message="ข้อมูลทริปในเครื่องนี้จะถูกลบ ข้อมูลที่ sync แล้วยังอยู่ในบัญชี เข้าสู่ระบบใหม่เมื่อไหร่ก็โหลดกลับมาได้"
        confirmLabel="ออกจากระบบ"
        destructive
        busy={busy}
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
