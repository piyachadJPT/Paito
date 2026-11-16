"use client";

import { useId } from "react";

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange(checked: boolean): void;
  disabled?: boolean;
}

/** iOS-style toggle row (role="switch"), the whole row is tappable. */
export function Switch({ label, description, checked, onChange, disabled }: SwitchProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center gap-3 text-left disabled:opacity-60"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-[17px] font-medium text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="block text-[13px] text-ink-2">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-line-strong"}`}
      >
        <span
          className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
