import type { Metadata } from "next";
import { MapPin } from "lucide-react";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · ไปต่อ" };

/** Login shell (no tab bar). The OTP flow is built in step 3. */
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-on-primary">
          <MapPin aria-hidden size={26} strokeWidth={2.4} />
        </span>
        <h1 className="text-[34px] leading-none font-bold tracking-tight">ไปต่อ</h1>
      </div>
      <p className="mt-4 text-ink-2">หน้าเข้าสู่ระบบจะมาในขั้นที่ 3</p>
    </main>
  );
}
