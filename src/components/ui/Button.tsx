import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "lg" | "md";

// "Pressable paper": a solid 3px shadow underneath; pressing drops the button
// onto it (instant state change, no transition).
const PRESS = "active:translate-y-[2px] active:shadow-none disabled:translate-y-0 disabled:shadow-none";

const VARIANTS: Record<Variant, string> = {
  primary: `bg-primary text-on-primary shadow-[0_3px_0_var(--primary-pressed)] ${PRESS} disabled:bg-line-strong disabled:text-ink-2`,
  secondary: `bg-card text-ink border-[1.5px] border-line-strong shadow-[0_3px_0_var(--line-strong)] ${PRESS} active:bg-card-sunken disabled:text-ink-3`,
  danger: `bg-warning-soft text-warning-ink border-[1.5px] border-warning/40 shadow-[0_3px_0_rgb(234_88_12/0.3)] ${PRESS} disabled:text-ink-3`,
  ghost: "bg-transparent text-primary active:bg-primary-soft disabled:text-ink-3",
};

const SIZES: Record<Size, string> = {
  lg: "min-h-14 w-full rounded-2xl px-5 text-[17px]", // primary actions: 56px, full width
  md: "min-h-11 rounded-xl px-4 text-[15px]", // ≥ 44px tap target
};

/** Same look for <a> (e.g. Google Maps links) as for <button>. */
export function buttonClasses(variant: Variant = "primary", size: Size = "lg", extra = ""): string {
  return `inline-flex select-none items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  icon,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden size={20} className="animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
