import type { DokumenPreset } from '../../types/api';

type Props = {
  presets: DokumenPreset[];
  loading: boolean;
  error?: string | null;
  onPilih: (preset: DokumenPreset) => void;
};

/** Daftar jenis dokumen: kartu ringkas, dua kolom. */
export default function DokumenPicker({ presets, loading, error, onPilih }: Props) {
  if (loading) {
    return <p className="text-center text-[13px] text-ink-muted">Memuat daftar dokumen…</p>;
  }

  if (error) {
    return <p className="text-center text-[13px] text-danger">{error}</p>;
  }

  if (presets.length === 0) {
    return <p className="text-center text-[13px] text-ink-muted">Belum ada jenis dokumen.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onPilih(preset)}
          className="flex h-full flex-col items-start justify-center gap-0.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-left shadow-card transition hover:border-navy-soft hover:bg-navy-soft/40"
        >
          <span className="flex w-full items-center gap-2">
            <span className="truncate text-[12px] font-semibold leading-4 text-ink">
              {preset.nama}
            </span>
          </span>
          {preset.deskripsi && (
            <span className="line-clamp-1 w-full text-[10px] leading-4 text-ink-muted">
              {preset.deskripsi}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
