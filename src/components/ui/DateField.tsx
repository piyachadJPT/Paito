"use client";

import { CalendarDays } from "lucide-react";
import { useId, useRef } from "react";
import { formatCalendarDate } from "@/lib/time";

export interface DateFieldProps {
  label: string;
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange(value: string): void;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: string | null;
}

/**
 * Date field with the app's own look (Thai date, Buddhist year). The real
 * <input type="date"> sits invisibly on top, so tapping opens the iOS date
 * wheel and keyboard/screen-reader access stays native.
 */
export function DateField({ label, value, onChange, min, max, disabled, error }: DateFieldProps) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold text-ink-2">
        {label}
      </label>
      <div
        className={`relative flex h-14 items-center gap-3 rounded-2xl border bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft ${
          error ? "border-warning" : "border-line-strong"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <CalendarDays aria-hidden size={20} className="shrink-0 text-primary" />
        <span className={`flex-1 text-[17px] ${value ? "text-ink" : "text-ink-3"}`} aria-hidden>
          {value ? formatCalendarDate(value) : "เลือกวันที่"}
        </span>
        <input
          ref={ref}
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => {
            try {
              ref.current?.showPicker?.();
            } catch {
              // not allowed in this browser; the native tap still works
            }
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-warning-ink">
          {error}
        </p>
      )}
    </div>
  );
}
