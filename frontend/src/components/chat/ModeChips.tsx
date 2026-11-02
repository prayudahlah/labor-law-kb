import type { Mode } from '../../types/app';
import { MODE_LABEL } from '../../config/constants';
import { cx } from '../../lib/cx';
import { IconChat, IconDoc } from '../common/icons';

type Props = { value: Mode; onChange: (next: Mode) => void };

const ORDER: readonly Mode[] = ['chat', 'dokumen'];

/**
 * Pengalih mode di dalam composer (gaya chips "Reasoning / Create Image"
 * pada referensi UI). Chat biasa -> thread, Asistensi Dokumen -> placeholder.
 */
export default function ModeChips({ value, onChange }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto" role="tablist">
      {ORDER.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition',
              active
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
