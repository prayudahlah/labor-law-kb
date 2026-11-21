import type { Mode } from '../../types/app';
import { MODE_LABEL } from '../../config/constants';
import { cx } from '../../lib/cx';
import { IconChat, IconDoc } from '../common/icons';

type Props = {
  value: Mode;
  onChange: (next: Mode) => void;
  /** Terkunci setelah percakapan dimulai: riwayat dipisah per mode. */
  disabled?: boolean;
};

const ORDER: readonly Mode[] = ['chat', 'dokumen'];

const TERKUNCI =
  'Mode terkunci selama percakapan berjalan. Klik New Chat untuk memilih mode lain.';

/**
 * Pengalih mode di dalam composer (gaya chips "Reasoning / Create Image"
 * pada referensi UI). Tanya Jawab -> thread, Asistensi Dokumen -> panel dokumen.
 *
 * `disabled` dipakai begitu percakapan berjalan: thread tersimpan di riwayat
 * dengan mode tertentu, jadi mode tidak boleh berpindah di tengah thread.
 */
export default function ModeChips({ value, onChange, disabled = false }: Props) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto"
      role="tablist"
      aria-disabled={disabled}
    >
      {ORDER.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            title={disabled ? TERKUNCI : undefined}
            onClick={() => onChange(mode)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition',
              disabled
                ? active
                  ? 'cursor-not-allowed border-navy bg-navy text-ink-inverse opacity-50'
                  : 'cursor-not-allowed border-line bg-surface text-ink-muted opacity-50'
                : active
                  ? 'border-navy bg-navy text-ink-inverse'
                  : 'border-line bg-surface text-ink-muted hover:border-navy-soft hover:bg-navy-soft hover:text-ink',
            )}
          >
            {mode === 'chat' ? (
              <IconChat className="h-3.5 w-3.5" />
            ) : (
              <IconDoc className="h-3.5 w-3.5" />
            )}
            {MODE_LABEL[mode]}
          </button>
        );
      })}
    </div>
  );
}
