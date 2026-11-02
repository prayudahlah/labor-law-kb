import { cx } from '../../lib/cx';
import { formatRelative } from '../../lib/time';
import { IconChat, IconDoc } from '../common/icons';
import type { RecentsFilter } from '../../types/app';
import type { RecentsGroup } from '../../lib/recents';

type Props = {
  groups: RecentsGroup[];
  loading: boolean;
  activeId: string | null;
  filter: RecentsFilter;
  query: string;
  onOpen: (id: string) => void;
};

export default function RecentsList({
  groups,
  loading,
  activeId,
  filter,
  query,
  onOpen,
}: Props) {
  const kosong = groups.length === 0;

  return (
    <div className="pt-4">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Riwayat
      </p>

      {loading && (
        <div className="mt-3 space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-line" />
          ))}
        </div>
      )}

      {!loading && kosong && (
        <div className="mt-3 rounded-xl border border-dashed border-line-strong bg-surface px-3 py-5 text-center">
          <p className="text-[12.5px] leading-5 text-ink-muted">
            {query
              ? `Tidak ada hasil untuk “${query}”.`
              : filter === 'semua'
                ? 'Belum ada percakapan.'
                : 'Belum ada riwayat untuk mode ini.'}
          </p>
          <p className="mt-1 text-[11.5px] leading-4 text-ink-muted opacity-75">
            Mulai chat baru untuk melihatnya di sini.
          </p>
        </div>
      )}

      {!loading &&
        !kosong &&
        groups.map((group) => (
          <section key={group.label} className="mt-4 first:mt-3">
            <p className="px-1 pb-1 text-[11px] font-medium text-ink-muted">{group.label}</p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const aktif = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(item.id)}
                      className={cx(
                        'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition',
                        aktif ? 'bg-navy-soft' : 'hover:bg-navy-soft',
                      )}
                    >
                      <span
                        className={cx(
                          'mt-0.5 shrink-0',
                          item.mode === 'dokumen' ? 'text-gold-text' : 'text-navy-light',
                        )}
                        aria-hidden="true"
                      >
                        {item.mode === 'dokumen' ? (
                          <IconDoc className="h-4 w-4" />
                        ) : (
                          <IconChat className="h-4 w-4" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={cx(
                            'block truncate text-[13px] leading-5',
                            aktif ? 'font-medium text-ink' : 'text-ink',
                          )}
                        >
                          {item.title}
                        </span>
                        <span className="block text-[11px] leading-4 text-ink-muted">
                          {formatRelative(item.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
