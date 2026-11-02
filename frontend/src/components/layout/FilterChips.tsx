import type { RecentsFilter } from '../../types/app';
import { cx } from '../../lib/cx';

const OPTIONS: ReadonlyArray<{ id: RecentsFilter; label: string }> = [
  { id: 'semua', label: 'Semua' },
  { id: 'chat', label: 'Chat' },
  { id: 'dokumen', label: 'Dokumen' },
];

type Props = { value: RecentsFilter; onChange: (next: RecentsFilter) => void };

/** Penyaring daftar recents: Semua / Chat / Dokumen. */
export default function FilterChips({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cx(
            'flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition',
            value === opt.id
              ? 'bg-navy text-ink-inverse'
              : 'text-ink-muted hover:bg-navy-soft hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
