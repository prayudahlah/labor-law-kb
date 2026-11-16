import type { ReactNode } from 'react';

type Props = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Kelas tambahan untuk cangkang (mis. `flex min-h-0 flex-1 flex-col`). */
  className?: string;
  /** Kelas tambahan untuk badan kartu. */
  bodyClassName?: string;
  /** Isi tambahan di sisi kanan kepala kartu (mis. jumlah pasal). */
  headerRight?: ReactNode;
};

/** Cangkang kartu respons: judul di kepala, isi di badan. */
export default function CardShell({
  title,
  icon,
  children,
  className,
  bodyClassName,
  headerRight,
}: Props) {
  return (
    <section
      className={[
        'overflow-hidden rounded-xl border border-line bg-surface shadow-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-muted px-3.5 py-2">
        {icon}
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
          {title}
        </h3>
        {headerRight && (
          <span className="ml-auto flex items-center gap-1.5 text-[10.5px] font-medium normal-case tracking-normal text-ink-muted">
            {headerRight}
          </span>
        )}
      </header>
      <div
        className={['px-3.5 py-3 text-[13.5px] leading-6 text-ink', bodyClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
