/**
 * Hand-drawn line art for empty states: a dashed road winding between two
 * pins over a folded map. Strokes use theme tokens, so it works in both modes.
 */
export function EmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" fill="none" aria-hidden className={className}>
      {/* folded paper map */}
      <path
        d="M18 30 L78 18 L142 32 L202 20 L202 112 L142 124 L78 110 L18 122 Z"
        fill="var(--card-sunken)"
        stroke="var(--line-strong)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M78 18 L78 110 M142 32 L142 124" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="2 4" />
      {/* winding road */}
      <path
        d="M46 96 C 66 92, 70 64, 96 66 S 128 92, 150 74 S 166 46, 178 44"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      {/* start pin */}
      <circle cx="46" cy="96" r="6" fill="var(--card)" stroke="var(--ink-2)" strokeWidth="2.5" />
      {/* destination pin */}
      <path
        d="M178 44 c0 -12 -8 -18 -14 -18 s-14 6 -14 18 c0 10 14 22 14 22 s14 -12 14 -22z"
        transform="translate(14 -4)"
        fill="var(--primary)"
      />
      <circle cx="178" cy="36" r="4.5" fill="var(--card)" />
      {/* tiny tree marks */}
      <path d="M112 40 l5 -10 l5 10 z M60 54 l4 -8 l4 8 z" fill="var(--type-sight)" opacity="0.7" />
    </svg>
  );
}
