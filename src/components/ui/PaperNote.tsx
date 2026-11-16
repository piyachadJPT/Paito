import type { AriaRole, ReactNode } from "react";

/**
 * Orange sticky note taped to the page — alerts and "running late" boxes.
 * Text stays upright-ish (0.5°) so it is easy to read at a glance.
 */
export function PaperNote({ children, role, className = "" }: { children: ReactNode; role?: AriaRole; className?: string }) {
  return (
    <div
      role={role}
      className={`relative rotate-[0.5deg] rounded-[4px] border border-warning/30 bg-warning-soft text-warning-ink shadow-[0_3px_8px_rgb(60_40_10/0.12)] ${className}`}
    >
      <span
        aria-hidden
        className="absolute -top-2 left-4 h-4 w-12 -rotate-6 bg-[rgb(222_184_110/0.6)] [clip-path:polygon(4%_0,96%_6%,100%_50%,95%_100%,3%_94%,0_45%)]"
      />
      {children}
    </div>
  );
}
