import type { ReactNode } from 'react';

type Props = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
};

/** Cangkang kartu respons: judul di kepala, isi di badan. */
export default function CardShell({ title, icon, children }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <header className="flex items-center gap-2 border-b border-line bg-surface-muted px-3.5 py-2">
        {icon}
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
          {title}
        </h3>
      </header>
      <div className="px-3.5 py-3 text-[13.5px] leading-6 text-ink">{children}</div>
    </section>
  );
}
