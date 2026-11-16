import { useMemo, useState } from 'react';

import { kunciButir } from '../../hooks/useChecklist';
import { cx } from '../../lib/cx';
import { labelManusia } from '../../lib/text';
import type { ButirKetentuan } from '../../types/api';
import CardShell from '../cards/CardShell';
import { IconDoc, IconSearch } from '../common/icons';

type Props = {
  butir: ButirKetentuan[];
  loading: boolean;
  error?: string | null;
  /** Topik yang lazim untuk dokumen ini — hanya penanda, bukan penyaring. */
  topikUtama?: readonly string[];
  /** Dokumen bertemplat: tabel murni rujukan, tanpa centang/progress. */
  tanpaCeklis?: boolean;
  /** Sembunyikan kolom "Jenis" (dipakai pada panel sempit). */
  sembunyikanJenis?: boolean;
  ditandai?: Set<string>;
  onToggle?: (kunci: string) => void;
  onHapusSemua?: () => void;
  /** Susun ringkasan (dan simpan ke riwayat). */
  onBuatRingkasan?: () => void;
};

type Chip = {
  topik: string | null;
  jumlah: number;
  disarankan: boolean;
};

/** Tabel rujukan pasal, dengan atau tanpa checklist. */
export default function DokumenKetentuanList({
  butir,
  loading,
  error,
  topikUtama = [],
  tanpaCeklis = false,
  sembunyikanJenis = false,
  ditandai = new Set<string>(),
  onToggle,
  onHapusSemua,
  onBuatRingkasan,
}: Props) {
  const [query, setQuery] = useState('');
  const [topik, setTopik] = useState<string | null>(null);

  const chips = useMemo<Chip[]>(() => {
    const jumlah = new Map<string, number>();
    for (const item of butir) {
      jumlah.set(item.topik, (jumlah.get(item.topik) ?? 0) + 1);
    }

    const disarankan = topikUtama.filter((item) => jumlah.has(item));
    const sisa = [...jumlah.keys()]
      .filter((item) => !disarankan.includes(item))
      .sort((a, b) => (jumlah.get(b) ?? 0) - (jumlah.get(a) ?? 0));

    return [
      { topik: null, jumlah: butir.length, disarankan: false },
      ...disarankan.map((item) => ({
        topik: item,
        jumlah: jumlah.get(item) ?? 0,
        disarankan: true,
      })),
      ...sisa.map((item) => ({
        topik: item,
        jumlah: jumlah.get(item) ?? 0,
        disarankan: false,
      })),
    ];
  }, [butir, topikUtama]);

  const dasar = useMemo(
    () => (topik ? butir.filter((item) => item.topik === topik) : butir),
    [butir, topik],
  );

  const jumlahTanda = useMemo(
    () => butir.filter((item) => ditandai.has(kunciButir(item))).length,
    [butir, ditandai],
  );

  const persen = butir.length === 0 ? 0 : Math.round((jumlahTanda / butir.length) * 100);
  const labelPersen = jumlahTanda > 0 && persen === 0 ? '<1%' : `${persen}%`;

  const hasil = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dasar;
    return dasar.filter((item) =>
      [item.pasal, item.topik, item.jenis, item.norma].some((nilai) =>
        nilai.toLowerCase().includes(q),
      ),
    );
  }, [dasar, query]);

  const gantiTopik = (next: string | null) => setTopik(next);

  return (
    <CardShell
      title="Rujukan pasal"
      icon={<IconDoc className="h-3.5 w-3.5" />}
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
      headerRight={
        tanpaCeklis
          ? `${butir.length} pasal rujukan${topik ? ` · tampil ${dasar.length}` : ''}`
          : undefined
      }
    >
      {loading ? (
        <p className="text-ink-muted">Memuat ketentuan…</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : butir.length === 0 ? (
        <p className="text-ink-muted">Tidak ada ketentuan untuk dokumen ini.</p>
      ) : (
        <>
          {!tanpaCeklis && (
            <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <p className="text-ink-muted">
                <span className="font-medium text-ink">{butir.length}</span> pasal terkait ·{' '}
                <span className={jumlahTanda > 0 ? 'font-medium text-navy' : ''}>
                  {jumlahTanda} ditandai
                </span>
                {topik && <span> · tampil {dasar.length}</span>}
              </p>

              {jumlahTanda > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  {onBuatRingkasan && (
                    <button
                      type="button"
                      onClick={onBuatRingkasan}
                      className="rounded-lg border border-navy-soft bg-navy-soft px-2.5 py-1 text-[11.5px] font-medium text-navy transition hover:border-navy hover:bg-surface"
                    >
                      Buat ringkasan ({jumlahTanda})
                    </button>
                  )}
                  {onHapusSemua && (
                    <button
                      type="button"
                      onClick={onHapusSemua}
                      className="text-[11.5px] font-medium text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
                    >
                      Hapus semua tanda
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!tanpaCeklis && (
            <div className="mb-1 flex shrink-0 items-center gap-2">
              <div
                className="h-1 flex-1 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuenow={jumlahTanda}
                aria-valuemin={0}
                aria-valuemax={butir.length}
                aria-label="Progres checklist pasal"
              >
                <div
                  className="h-full rounded-full bg-navy transition-all"
                  style={{ width: `${persen}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-muted">
                {labelPersen}
              </span>
            </div>
          )}

          <div className="mb-2 shrink-0">
            <span className="mb-0.5 block text-[10.5px] font-medium uppercase tracking-wide text-ink-muted">
              Saring topik:
            </span>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {chips.map((chip) => {
                const aktif = topik === chip.topik;
                return (
                  <button
                    key={chip.topik ?? 'semua'}
                    type="button"
                    onClick={() => gantiTopik(chip.topik)}
                    title={
                      chip.disarankan ? 'Topik yang lazim dipakai dokumen ini' : undefined
                    }
                    className={cx(
                      'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition',
                      aktif
                        ? 'border-navy bg-navy text-ink-inverse'
                        : 'border-line text-ink-muted hover:border-navy-soft hover:bg-navy-soft',
                    )}
                  >
                    <span>{chip.topik ?? 'Semua'}</span>
                    <span className={cx('tabular-nums', aktif ? 'opacity-80' : 'opacity-60')}>
                      {chip.jumlah}
                    </span>
                    {chip.disarankan && (
                      <span
                        aria-hidden="true"
                        className={cx(
                          'text-[13px] leading-none',
                          aktif ? 'text-gold-soft' : 'text-gold',
                        )}
                      >
                        •
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-1 flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-2 py-0.5">
            <IconSearch className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari pasal, topik, atau jenis…"
              aria-label="Cari pasal"
              className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-muted"
            />
          </div>

          {hasil.length === 0 ? (
            <p className="text-ink-muted">Tidak ada pasal yang cocok.</p>
          ) : (
            <div className="-mx-3.5 min-h-0 flex-1 overflow-auto px-3.5">
              <table className="w-full border-collapse text-left align-top">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                    {!tanpaCeklis && (
                      <th className="w-6 py-1.5 pr-2 font-semibold">
                        <span className="sr-only">Sudah dimasukkan</span>
                      </th>
                    )}
                    <th className="py-1.5 pr-3 font-semibold">Pasal</th>
                    <th className="py-1.5 pr-3 font-semibold">Topik</th>
                    {!sembunyikanJenis && (
                      <th className="py-1.5 pr-3 font-semibold">Jenis</th>
                    )}
                    <th className="py-1.5 font-semibold">Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.map((item, index) => {
                    const kunci = kunciButir(item);
                    const dicentang = !tanpaCeklis && ditandai.has(kunci);
                    return (
                      <tr
                        key={`${kunci}-${index}`}
                        className={cx(
                          'border-b border-line align-top last:border-b-0',
                          dicentang && 'bg-navy-soft/30',
                        )}
                      >
                        {!tanpaCeklis && (
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="checkbox"
                              checked={dicentang}
                              onChange={() => onToggle?.(kunci)}
                              aria-label={`Tandai ${item.pasal}`}
                              className="mt-0.5 h-3.5 w-3.5 accent-navy"
                            />
                          </td>
                        )}
                        <td className="whitespace-nowrap py-2 pr-3 font-medium text-ink">
                          {item.pasal}
                        </td>
                        <td className="py-2 pr-3 text-ink-muted">{item.topik}</td>
                        {!sembunyikanJenis && (
                          <td className="py-2 pr-3 text-ink">{labelManusia(item.jenis)}</td>
                        )}
                        <td className="py-2">
                          {item.tautan ? (
                            <a
                              href={item.tautan}
                              target="_blank"
                              rel="noreferrer"
                              className="text-navy underline decoration-line-strong underline-offset-2 hover:text-navy-hover"
                            >
                              Buka
                            </a>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </CardShell>
  );
}
