"use client";

import { forwardRef, useId } from "react";

/** Must match Supabase → Auth → Email → "Email OTP Length" (project is set to 8). */
export const OTP_LENGTH = 8;

/** Keep digits only, max OTP_LENGTH (handles pasted "1234 5678" or "1234-5678"). */
export function sanitizeOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export interface OtpInputProps {
  value: string;
  onChange(value: string): void;
  /** Called once all digits are entered (typed, pasted or iOS autofill). */
  onComplete?(value: string): void;
  label: string;
  error?: string | null;
  disabled?: boolean;
}

/**
 * One real <input> (so iOS "From Messages/Mail" one-time-code autofill works),
 * styled as a large spaced code with rounded numerals.
 */
export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, label, error, disabled },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold text-ink-2">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => {
          const next = sanitizeOtp(e.target.value);
          onChange(next);
          if (next.length === OTP_LENGTH) onComplete?.(next);
        }}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={OTP_LENGTH + 2}
        enterKeyHint="done"
        placeholder={"0".repeat(OTP_LENGTH)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block h-[72px] w-full rounded-2xl border bg-card text-center font-[family-name:var(--font-rounded)] text-[32px] font-bold tracking-[0.28em] text-ink tabular-nums outline-none placeholder:text-line-strong focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:opacity-60 ${
          error ? "border-warning" : "border-line-strong"
        }`}
        style={{ textIndent: "0.28em" }}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-warning-ink">
          {error}
        </p>
      )}
    </div>
  );
});
