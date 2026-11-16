import type { ReactNode } from "react";

const SIZES = {
  sm: "size-[52px] text-[10px] border-2",
  md: "size-[76px] text-[11px] border-[2.5px]",
} as const;

const TONES = {
  red: "border-ink-red/80 text-ink-red",
  blue: "border-primary/80 text-primary",
  // over the postcard picture: red ink on a paper disc, so it passes contrast on any sky
  postmark: "border-ink-red/80 bg-card/90 text-ink-red",
} as const;

/**
 * Round rubber-stamp / postmark (SPEC U11). Text is the real content (never
 * colour alone); long names wrap and clamp to three lines inside the ring.
 */
export function Stamp({
  children,
  size = "md",
  tone = "red",
  rotate = -12,
  clamp = true,
  className = "",
}: {
  children: ReactNode;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  rotate?: number;
  /** false when the caller clamps part of the text itself (e.g. name clamped, time always shown) */
  clamp?: boolean;
  className?: string;
}) {
  return (
    <span
      style={{ transform: `rotate(${rotate}deg)` }}
      className={`grid shrink-0 place-items-center rounded-full p-1.5 text-center font-hand leading-[1.15] font-bold ${SIZES[size]} ${TONES[tone]} ${className}`}
    >
      <span className={clamp ? "line-clamp-3 break-words" : "break-words"}>{children}</span>
    </span>
  );
}
