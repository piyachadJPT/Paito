import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "lg" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary active:bg-primary-pressed disabled:bg-line-strong disabled:text-ink-2",
  secondary: "bg-card text-primary border border-line active:bg-card-sunken disabled:text-ink-3",
  danger: "bg-warning-soft text-warning-ink active:bg-warning/25 disabled:text-ink-3",
  ghost: "bg-transparent text-primary active:bg-primary-soft disabled:text-ink-3",
};

const SIZES: Record<Size, string> = {
  lg: "min-h-14 w-full rounded-2xl px-5 text-[17px]", // primary actions: 56px, full width
  md: "min-h-11 rounded-xl px-4 text-[15px]", // ≥ 44px tap target
};

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
      className={`inline-flex select-none items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden size={20} className="animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
