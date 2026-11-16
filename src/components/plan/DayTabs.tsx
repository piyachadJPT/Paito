"use client";

import { useEffect, useRef } from "react";
import { formatCalendarDayMonth } from "@/lib/time";
import type { DayRow } from "@/services/data/types";

/** Horizontally scrollable day picker: "D1 31 ธ.ค." (SPEC §10.4). */
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
      <ul className="flex w-max gap-2 py-1">
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
                className={`flex min-h-11 flex-col items-center justify-center rounded-2xl border px-4 py-1.5 leading-tight ${
                  active ? "border-primary bg-primary text-on-primary" : "border-line bg-card text-ink active:bg-card-sunken"
                }`}
              >
                <span className="text-[13px] font-bold">
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
