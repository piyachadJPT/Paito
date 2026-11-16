import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyIllustration } from "@/components/ui/EmptyIllustration";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <EmptyIllustration className="w-48" />
      <h1 className="mt-4 text-[22px] font-bold">หลงทางนิดหน่อย</h1>
      <p className="mt-1 text-[15px] text-ink-2">ไม่มีหน้านี้ในแอป</p>
      <Link href="/" className={buttonClasses("primary", "lg", "mt-6")}>
        กลับไปหน้า “ตอนนี้”
      </Link>
    </main>
  );
}
