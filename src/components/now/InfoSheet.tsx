"use client";

import { NotebookText, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { splitPhones } from "@/lib/text/phone";

/** "ข้อมูลสำคัญ" button + sheet with tappable phone numbers (SPEC §10.3 item 6). */
export function InfoButton({ note }: { note: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card px-4 text-left active:bg-card-sunken"
      >
        <NotebookText aria-hidden size={20} className="shrink-0 text-primary" />
        <span className="flex-1 text-[16px] font-semibold">ข้อมูลสำคัญ</span>
        <span className="text-[13px] text-ink-2">เลขจอง · เบอร์โทร</span>
      </button>
      <BottomSheet open={open} title="ข้อมูลสำคัญ" onClose={() => setOpen(false)}>
        {note?.trim() ? (
          <p className="mt-3 text-[17px] leading-relaxed break-words whitespace-pre-wrap">
            {splitPhones(note).map((part, i) =>
              part.kind === "phone" ? (
                <a
                  key={i}
                  href={`tel:${part.tel}`}
                  className="inline-flex items-center gap-1 rounded-lg px-1 font-semibold text-primary underline underline-offset-4"
                >
                  <Phone aria-hidden size={15} />
                  {part.text}
                </a>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
        ) : (
          <p className="mt-3 text-[15px] text-ink-2">
            ยังไม่มีข้อมูล ใส่เลขจอง เบอร์ที่พัก หรือประกันรถได้ที่{" "}
            <Link href="/settings" className="font-semibold text-primary">
              ตั้งค่า
            </Link>
          </p>
        )}
      </BottomSheet>
    </>
  );
}
