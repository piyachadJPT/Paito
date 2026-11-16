"use client";

import { HandIcon } from "@/components/ui/icons";
import { useId, useRef } from "react";

export interface TimeFieldProps {
  label: string;
  /** "HH:MM" or "" */
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  hint?: string;
}

/**
 * Time field in the app's look ("13:30 น."); the real <input type="time">
 * sits invisibly on top so iOS shows its time wheel (same approach as DateField, D24).
 */
export function TimeField({ label, value, onChange, disabled, hint }: TimeFieldProps) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-hand text-[16px] font-bold text-ink-2">
        {label}
      </label>
      <div
        className={`relative flex h-14 items-center gap-3 rounded-[8px] border-[1.5px] border-line-strong bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <HandIcon name="now" size={22} className="text-primary" />
        <span aria-hidden className={`flex-1 text-[17px] tabular-nums ${value ? "text-ink" : "text-ink-3"}`}>
          {value ? `${value} น.` : "เลือกเวลา"}
        </span>
        <input
          ref={ref}
          id={id}
          type="time"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => {
            try {
              ref.current?.showPicker?.();
            } catch {
              // native tap still works
            }
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {hint && <p className="mt-2 text-sm text-ink-2">{hint}</p>}
    </div>
  );
}
