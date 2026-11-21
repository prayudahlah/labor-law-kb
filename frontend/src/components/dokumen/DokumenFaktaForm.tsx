import type { MutableRefObject } from 'react';

import { cx } from '../../lib/cx';
import type { DokumenPreset } from '../../types/api';
import CardShell from '../cards/CardShell';
import { IconDoc } from '../common/icons';

type Field = {
  nama: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'date';
  wajib?: boolean;
};

const FIELDS: readonly Field[] = [
  { nama: 'nama_perusahaan', label: 'Nama perusahaan', placeholder: 'PT Maju Jaya', wajib: true },
  { nama: 'nomor_peraturan', label: 'Nomor peraturan', placeholder: '01/PP/2026' },
  { nama: 'tanggal_berlaku', label: 'Tanggal berlaku', type: 'date' },
];

type Props = {
  preset: DokumenPreset;
  fakta: Record<string, string>;
  onUbah: (nama: string, nilai: string) => void;
  onSusun: () => void;
  loading: boolean;
  /** Nama perusahaan kosong saat menyimpan/meringkas. */
  errorNama?: boolean;
  /** Penanda agar animasi getar bisa diputar ulang. */
  goyangNama?: boolean;
  namaRef?: MutableRefObject<HTMLInputElement | null>;
};

/** Isian singkat yang dipakai header template draf. */
export default function DokumenFaktaForm({
  preset,
  fakta,
  onUbah,
  onSusun,
  loading,
  errorNama,
  goyangNama,
  namaRef,
}: Props) {
  const nama = (fakta.nama_perusahaan ?? '').trim();
  const bisa = nama.length > 0 && !loading;

  return (
    <CardShell
      title="Data dokumen"
      icon={<IconDoc className="h-3.5 w-3.5" />}
      className="shrink-0"
    >
      <p className="mb-2 text-ink-muted">
        Dipakai untuk mengisi bagian kepala <span className="text-ink">{preset.nama}</span>.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {FIELDS.map((field) => {
          const salah = field.nama === 'nama_perusahaan' && errorNama;
          return (
            <label key={field.nama} className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">
                {field.label}
                {field.wajib ? ' *' : ''}
              </span>
              <input
                ref={field.nama === 'nama_perusahaan' ? namaRef : undefined}
                type={field.type ?? 'text'}
                value={fakta[field.nama] ?? ''}
                onChange={(event) => onUbah(field.nama, event.target.value)}
                placeholder={field.placeholder}
                aria-invalid={salah}
                style={
                  salah
                    ? {
                        borderColor: 'var(--c-danger)',
                        backgroundColor: 'var(--c-danger-soft)',
                      }
                    : undefined
                }
                className={cx(
                  'rounded-lg border border-line-strong px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition focus:border-navy-light',
                  salah && 'placeholder:text-danger/70',
                  goyangNama && field.nama === 'nama_perusahaan' && 'goyang',
                )}
              />
            </label>
          );
        })}
      </div>

      {errorNama && (
        <p className="mt-1.5 text-[10.5px] text-danger">
          Nama perusahaan wajib diisi sebelum menyimpan.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSusun}
          disabled={!bisa}
          className="rounded-lg bg-navy px-3 py-1.5 text-[12.5px] font-medium text-ink-inverse transition hover:bg-navy-hover disabled:bg-line-strong disabled:text-surface"
        >
          {loading ? 'Menyusun draf…' : 'Susun draf'}
        </button>
        <span className="text-[11px] text-ink-muted">
          Nama perusahaan wajib; nomor dan tanggal boleh kosong (diisi “-”).
        </span>
      </div>
    </CardShell>
  );
}
