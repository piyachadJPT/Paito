import { CircleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  inputClassName?: string;
}

/** Text input with label, hint and error. 17px text so iOS never zooms on focus. */
export function TextField({
  label,
  hint,
  error,
  hideLabel = false,
  className = "",
  inputClassName = "",
  id,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "mb-2 block text-[15px] font-semibold text-ink-2"}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block h-14 w-full appearance-none rounded-2xl border bg-card px-4 text-[17px] text-ink outline-none placeholder:text-ink-3 focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:opacity-60 ${
          error ? "border-warning" : "border-line-strong"
        } ${inputClassName}`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-2 text-sm text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-warning-ink">
          <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
