import type { ReactNode } from "react";
import { SyncStatusPill } from "@/components/sync/SyncStatusPill";

/** Page title with the sync status on the right. */
export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pt-3">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      <div className="pt-1">
        <SyncStatusPill />
      </div>
    </header>
  );
}

/** Grouped settings card with a small caption, iOS-style. */
export function Section({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-ink-2">{title}</h2>
      <div className="rounded-[var(--radius-card)] border border-line bg-card">{children}</div>
      {footer && <div className="mt-2 px-1 text-[13px] leading-relaxed text-ink-2">{footer}</div>}
    </section>
  );
}
