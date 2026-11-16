import { PageHeader } from "./PageHeader";

/** Temporary content for tabs that are built in later steps. */
export function PagePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <section>
      <PageHeader title={title} />
      <p className="mt-6 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card px-4 py-6 text-center text-ink-2">
        {note}
      </p>
    </section>
  );
}
