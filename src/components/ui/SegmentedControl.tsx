"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** decorative icon above the label */
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange(value: T): void;
  disabled?: boolean;
}

/** iOS-style segmented control as an ARIA radio group (arrow keys move). */
export function SegmentedControl<T extends string | number>({ label, options, value, onChange, disabled }: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[10px] bg-card-sunken p-1">
      {options.map((opt, i) => {
        const checked = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-11 flex-1 rounded-[7px] px-2 text-[15px] font-semibold tabular-nums disabled:opacity-50 ${
              checked ? "bg-card text-primary shadow-[0_2px_0_var(--line-strong)]" : "text-ink-2 active:bg-card/60"
            }`}
          >
            {opt.icon ? (
              <span className="flex flex-col items-center gap-0.5 py-1.5">
                {opt.icon}
                <span className="text-[13px]">{opt.label}</span>
              </span>
            ) : (
              opt.label
            )}
          </button>
        );
      })}
    </div>
  );
}
