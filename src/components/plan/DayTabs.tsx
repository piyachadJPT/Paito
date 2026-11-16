"use client";

import { useEffect, useRef } from "react";
import { formatCalendarDayMonth } from "@/lib/time";
import type { DayRow } from "@/services/data/types";

/** Horizontally scrollable day picker as ticket stubs: "D1 31 ธ.ค." (SPEC §10.4). */
export function DayTabs({
  days,
  selected,
  today,
  onSelect,
}: {
  days: DayRow[];
  selected: number;
  today: number | null;
  onSelect(dayNumber: number): void;
}) {
  const refs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => {
    refs.current.get(selected)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <nav aria-label="เลือกวัน" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex w-max gap-3 px-1 py-2">
        {days.map((d) => {
          const active = d.day_number === selected;
          return (
            <li key={d.id}>
              <button
                ref={(el) => {
                  if (el) refs.current.set(d.day_number, el);
                }}
                type="button"
                aria-current={active ? "date" : undefined}
                onClick={() => onSelect(d.day_number)}
                // ticket stub: notched sides, alternately tilted like stubs tucked into a journal
                className={`relative flex min-h-12 flex-col items-center justify-center rounded-[5px] px-4 py-1.5 leading-tight shadow-[0_2px_6px_rgb(60_40_10/0.14)] ${
                  d.day_number % 2 ? "-rotate-1" : "rotate-1"
                } ${active ? "bg-primary text-on-primary" : "bg-card text-ink active:bg-card-sunken"}`}
              >
                <span aria-hidden className="absolute top-1/2 -left-[6px] size-3 -translate-y-1/2 rounded-full bg-canvas" />
                <span aria-hidden className="absolute top-1/2 -right-[6px] size-3 -translate-y-1/2 rounded-full bg-canvas" />
                <span className="font-hand text-[15px] font-bold">
                  D{d.day_number}
                  {today === d.day_number && <span className={active ? "" : "text-primary"}> · วันนี้</span>}
                </span>
                <span className={`text-[12px] ${active ? "opacity-90" : "text-ink-2"}`}>{formatCalendarDayMonth(d.date)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
