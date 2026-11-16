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
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "mb-2 block font-hand text-[16px] font-bold text-ink-2"}>
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-describedby={hint ? hintId : undefined}
        className="block w-full resize-y appearance-none rounded-[8px] border-[1.5px] border-line-strong bg-card bg-[repeating-linear-gradient(transparent_0_27px,var(--line-strong)_27px_28px)] bg-local bg-[position:0_12px] px-4 py-3 text-[17px] leading-[28px] text-ink outline-none placeholder:text-ink-3 focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:opacity-60"
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
