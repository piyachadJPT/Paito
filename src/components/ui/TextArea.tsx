import { useId, type TextareaHTMLAttributes } from "react";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  hideLabel?: boolean;
}

/** Multi-line input styled like TextField (17px: no iOS zoom). */
export function TextArea({ label, hint, hideLabel = false, className = "", id, rows = 5, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "mb-2 block text-[15px] font-semibold text-ink-2"}>
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-describedby={hint ? hintId : undefined}
        className="block w-full resize-y appearance-none rounded-2xl border border-line-strong bg-card px-4 py-3 text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:opacity-60"
        {...rest}
      />
      {hint && (
        <p id={hintId} className="mt-2 text-sm text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}
