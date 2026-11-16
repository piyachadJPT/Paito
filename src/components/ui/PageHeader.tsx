import type { ReactNode } from "react";
import { SyncStatusPill } from "@/components/sync/SyncStatusPill";

/** Page title with the sync status on the right. */
export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pt-3">
      <div className="min-w-0">
        <h1 className="font-hand text-[30px] leading-[1.3] font-bold">{title}</h1>
        {subtitle && <p className="font-hand text-[16px] font-semibold text-ink-2">{subtitle}</p>}
      </div>
      <div className="pt-1">
        <SyncStatusPill />
      </div>
    </header>
  );
}

/** Grouped settings card: a handwritten caption over a slip of paper. */
export function Section({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 font-hand text-[16px] font-bold text-ink-2">{title}</h2>
      <div className="rounded-[6px] bg-card shadow-[0_3px_10px_rgb(60_40_10/0.12)]">{children}</div>
      {footer && <div className="mt-2 px-1 text-[13px] leading-relaxed text-ink-2">{footer}</div>}
    </section>
  );
}
