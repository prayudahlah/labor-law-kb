import { cx } from '../../lib/cx';
import { formatRelative } from '../../lib/time';
import { IconChat, IconDoc, IconTrash } from '../common/icons';
import type { RecentsFilter } from '../../types/app';
import type { RecentsGroup } from '../../lib/recents';

type Props = {
  groups: RecentsGroup[];
  loading: boolean;
  activeId: string | null;
  filter: RecentsFilter;
  query: string;
  onOpen: (id: string) => void;
  onHapus: (id: string) => void;
};

export default function RecentsList({
  groups,
  loading,
  activeId,
  filter,
  query,
  onOpen,
  onHapus,
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
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen(item.id);
                        }
                      }}
                      title={item.title}
                      className={cx(
                        'group flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-left transition',
                        aktif ? 'bg-navy-soft' : 'hover:bg-navy-soft',
                      )}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onHapus(item.id);
                        }}
                        aria-label={`Hapus riwayat ${item.title}`}
                        title="Hapus riwayat"
                        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded"
                      >
                        <span
                          className={cx(
                            'block group-hover:hidden group-focus-within:hidden',
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
                        <span
                          className="hidden text-danger group-hover:block group-focus-within:block"
                          aria-hidden="true"
                        >
                          <IconTrash className="h-4 w-4" />
                        </span>
                      </button>

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
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
