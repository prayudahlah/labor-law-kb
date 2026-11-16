import { useMemo, useState } from 'react';

import { cariDokumen } from '../../lib/cariDokumen';
import { bisaDraf } from '../../lib/dokumen';
import type { DokumenPreset } from '../../types/api';
import type { Mode } from '../../types/app';
import ModeChips from '../chat/ModeChips';
import { IconSearch } from '../common/icons';
import DokumenPicker from './DokumenPicker';

type Props = {
  mode: Mode;
  onModeChange: (next: Mode) => void;
  presets: DokumenPreset[];
  loading: boolean;
  error?: string | null;
  onPilih: (preset: DokumenPreset) => void;
};

/**
 * Layar awal mode dokumen — mengikuti pola `EmptyState` chat (konten di
 * tengah), dengan pencarian di atas dan daftar dokumen dua kolom di bawahnya.
 */
export default function DokumenEmptyState({
  mode,
  onModeChange,
  presets,
  loading,
  error,
  onPilih,
}: Props) {
  const [kata, setKata] = useState('');
  const adaKata = kata.trim().length > 0;
  const hasil = useMemo(
    () => (adaKata ? cariDokumen(kata, presets) : []),
    [adaKata, kata, presets],
  );

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-6">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink">
            Mau buat dokumen apa?
          </h1>
          <p className="mt-1 max-w-lg text-[12px] leading-5 text-ink-muted">
            Ketik kebutuhan Anda, atau pilih langsung dari jenis dokumen di bawah.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-1.5 shadow-card">
          <IconSearch className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          <input
            value={kata}
            onChange={(event) => setKata(event.target.value)}
            placeholder="Mis. “surat izin cuti tahunan untuk karyawan”"
            aria-label="Cari jenis dokumen"
            className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-muted"
          />
          {adaKata && (
            <button
              type="button"
              onClick={() => setKata('')}
              className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-ink-muted transition hover:border-navy-soft hover:text-ink"
            >
              Hapus
            </button>
          )}
        </div>

        {adaKata && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {hasil.length > 0 ? `Hasil untuk “${kata.trim()}”` : `Tidak ada yang cocok`}
              </span>
              <button
                type="button"
                onClick={() => setKata('')}
                className="text-[11px] font-medium text-navy hover:underline"
              >
                Lihat semua dokumen
              </button>
            </div>

            {hasil.length > 0 ? (
              hasil.map(({ preset, cocok }) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onPilih(preset)}
                  className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-navy-light bg-surface px-3 py-2 text-left transition hover:bg-navy-soft"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-ink">{preset.nama}</span>
                    <span className="block text-[10px] text-ink-muted">
                      cocok: {cocok.join(', ')}
                    </span>
                  </span>
                  {bisaDraf(preset) && (
                    <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[9.5px] font-medium text-gold-text">
                      Draf tersedia
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-line-strong bg-surface px-3 py-2 text-[11.5px] text-ink-muted">
                Coba kata lain seperti <span className="text-ink">cuti</span>,{' '}
                <span className="text-ink">lembur</span>, atau{' '}
                <span className="text-ink">phk</span>, atau pilih langsung di bawah.
              </p>
            )}
          </div>
        )}

        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Atau pilih langsung
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <DokumenPicker
          presets={presets}
          loading={loading}
          error={error}
          onPilih={onPilih}
        />

        <div className="mt-3 rounded-2xl border border-line bg-surface px-3 py-2 shadow-card">
          <ModeChips value={mode} onChange={onModeChange} />
        </div>
      </div>
    </div>
  );
}
