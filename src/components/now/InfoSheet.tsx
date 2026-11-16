"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { HandIcon } from "@/components/ui/icons";
import { splitPhones } from "@/lib/text/phone";

/** "ข้อมูลสำคัญ" button + sheet with tappable phone numbers (SPEC §10.3 item 6). */
export function InfoButton({ note }: { note: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* notebook index tab: coloured spine on the left, clipped corner top-right */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-stretch overflow-hidden rounded-l-[6px] bg-card text-left shadow-[0_3px_10px_rgb(60_40_10/0.12)] [clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,0_100%)] active:bg-card-sunken focus-visible:outline-offset-[-3px]"
      >
        <span className="grid w-12 shrink-0 place-items-center bg-primary-soft text-primary">
          <HandIcon name="notebook" size={22} />
        </span>
        <span className="flex flex-1 items-center gap-3 px-4">
          <span className="flex-1 font-hand text-[17px] font-bold">ข้อมูลสำคัญ</span>
          <span className="text-[13px] text-ink-2">เลขจอง · เบอร์โทร</span>
        </span>
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
                  <HandIcon name="phone" size={16} />
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
