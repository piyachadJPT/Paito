/** Temporary content for tabs that are built in later steps. */
export function PagePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <section className="pt-4">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
      <p className="mt-6 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card px-4 py-6 text-center text-ink-2">
        {note}
      </p>
    </section>
  );
}
