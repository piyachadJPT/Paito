"use client";

import { Minus, Plus } from "lucide-react";
import { useId } from "react";

export interface StepperProps {
  label: string;
  /** null = not filled in */
  value: number | null;
  onChange(value: number | null): void;
  step: number;
  min?: number;
  max?: number;
  unit: string;
  /** Text shown when value is null */
  emptyText?: string;
  disabled?: boolean;
}

/** − [value] + with a typeable number (17px, numeric keypad). */
export function Stepper({ label, value, onChange, step, min = 0, max = 24 * 60, unit, emptyText = "—", disabled }: StepperProps) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold text-ink-2">
        {label}
      </label>
      <div className="flex h-14 items-stretch overflow-hidden rounded-2xl border border-line-strong bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft">
        <button
          type="button"
          aria-label={`ลด ${step} ${unit}`}
          disabled={disabled || value === null || value <= min}
          onClick={() => value !== null && onChange(clamp(value - step))}
          className="grid w-14 shrink-0 place-items-center text-primary active:bg-primary-soft disabled:text-ink-3"
        >
          <Minus aria-hidden size={20} strokeWidth={2.5} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5 border-x border-line">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value === null ? "" : String(value)}
            placeholder={emptyText}
            disabled={disabled}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              onChange(digits === "" ? null : clamp(Number(digits)));
            }}
            className="w-16 bg-transparent text-center text-[20px] font-semibold tabular-nums text-ink outline-none placeholder:text-[15px] placeholder:font-normal placeholder:text-ink-3"
          />
          {value !== null && <span className="text-[15px] text-ink-2">{unit}</span>}
        </div>
        <button
          type="button"
          aria-label={`เพิ่ม ${step} ${unit}`}
          disabled={disabled || (value !== null && value >= max)}
          onClick={() => onChange(clamp((value ?? 0) + step))}
          className="grid w-14 shrink-0 place-items-center text-primary active:bg-primary-soft disabled:text-ink-3"
        >
          <Plus aria-hidden size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
