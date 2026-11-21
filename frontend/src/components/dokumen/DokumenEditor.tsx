import { useEffect, useMemo, useRef, useState } from 'react';

import { formatTanggalPanjang, judulDokumen, namaBerkas } from '../../lib/dokumen';
import { cx } from '../../lib/cx';
import type { ButirKetentuan, DokumenPreset } from '../../types/api';
import { IconCopy, IconDownload } from '../common/icons';
import DokumenKetentuanList from './DokumenKetentuanList';

type Props = {
  preset: DokumenPreset;
  butir: ButirKetentuan[];
  loadingButir: boolean;
  butirError?: string | null;
  fakta: Record<string, string>;
  onUbahFakta: (nama: string, nilai: string) => void;
  drafTeks: string;
  onUbahDrafTeks: (nilai: string) => void;
  onSimpan: () => void;
  onKembali: () => void;
  /** Cuplikan entri tersimpan untuk menghitung status "ada perubahan". */
  entriTersimpan?: { fakta: Record<string, string>; drafTeks: string } | null;
};

const kunciFakta = (fakta: Record<string, string>): string =>
  JSON.stringify(
    Object.entries(fakta)
      .filter(([, nilai]) => nilai.trim().length > 0)
      .sort(),
  );

/**
 * Editor dokumen bertemplat: rujukan pasal di kiri, draf di kanan.
 * Di layar sempit, keduanya menumpuk (tabel di atas, draf di bawah).
 */
export default function DokumenEditor({
  preset,
  butir,
  loadingButir,
  butirError,
  fakta,
  onUbahFakta,
  drafTeks,
  onUbahDrafTeks,
  onSimpan,
  onKembali,
  entriTersimpan,
}: Props) {
  const nama = (fakta.nama_perusahaan ?? '').trim();
  const nomor = (fakta.nomor_peraturan ?? '').trim();
  const tanggal = (fakta.tanggal_berlaku ?? '').trim();

  const judul = judulDokumen(preset.nama, nama);
  const tanggalTampil = formatTanggalPanjang(tanggal);

  const [errorNama, setErrorNama] = useState(false);
  const [goyang, setGoyang] = useState(0);
  const inputNama = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<'idle' | 'tersalin' | 'gagal'>('idle');

  useEffect(() => {
    if (goyang === 0) return;
    const timer = window.setTimeout(() => setGoyang(0), 400);
    return () => window.clearTimeout(timer);
  }, [goyang]);

  const adaPerubahan = useMemo(() => {
    if (entriTersimpan) {
      return (
        kunciFakta(fakta) !== kunciFakta(entriTersimpan.fakta) ||
        drafTeks !== entriTersimpan.drafTeks
      );
    }
    return [nama, nomor, tanggal, drafTeks].some((nilai) => nilai.length > 0);
  }, [entriTersimpan, fakta, drafTeks, nama, nomor, tanggal]);

  const teksDokumen = () => {
    const kepala = `# ${judul}\nNomor: ${nomor || '-'} · Tanggal berlaku: ${tanggalTampil}`;
    const badan = drafTeks.trim();
    return badan ? `${kepala}\n\n${badan}` : kepala;
  };

  const simpan = () => {
    if (!nama) {
      setErrorNama(true);
      setGoyang((nilai) => nilai + 1);
      inputNama.current?.focus();
      return;
    }
    onSimpan();
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teksDokumen());
      setStatus('tersalin');
    } catch {
      setStatus('gagal');
    }
    window.setTimeout(() => setStatus('idle'), 2000);
  };

  const unduh = () => {
    const blob = new Blob([teksDokumen()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = namaBerkas(preset.nama, nama);
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    URL.revokeObjectURL(url);
  };

  const kelasInput = (salah: boolean) =>
    cx(
      'h-6 w-full min-w-0 rounded-md border px-2 text-[11px] text-ink outline-none transition focus:border-navy-light',
      salah ? 'placeholder:text-danger/70' : 'border-line-strong bg-surface',
      goyang > 0 && salah && 'goyang',
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col gap-2 px-6 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold text-ink">{preset.nama}</h1>
          <button
            type="button"
            onClick={onKembali}
            className="ml-auto rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-muted transition hover:border-navy-soft hover:text-ink"
          >
            ← Kembali
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
          <div className="flex min-h-0 basis-[44%] flex-col lg:basis-[54%]">
            <DokumenKetentuanList
              butir={butir}
              loading={loadingButir}
              error={butirError}
              tanpaCeklis
              sembunyikanJenis
            />
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-muted px-3 py-1.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Draf
              </h2>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={simpan}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-[11px] transition',
                    adaPerubahan
                      ? 'border-navy bg-navy font-semibold text-ink-inverse hover:bg-navy-hover'
                      : 'border-line bg-surface font-medium text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  Simpan draf
                </button>
                <button
                  type="button"
                  onClick={salin}
                  className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
                >
                  <IconCopy className="h-3 w-3" />
                  {status === 'tersalin' ? 'Tersalin' : status === 'gagal' ? 'Gagal' : 'Salin'}
                </button>
                <button
                  type="button"
                  onClick={unduh}
                  className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
                >
                  <IconDownload className="h-3 w-3" />
                  Unduh
                </button>
              </div>
            </header>

            <div className="shrink-0 space-y-1.5 border-b border-line px-3 py-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-ink-muted">
                  Nama perusahaan <span className="text-danger">*</span>
                </span>
                <input
                  ref={inputNama}
                  value={fakta.nama_perusahaan ?? ''}
                  onChange={(event) => {
                    onUbahFakta('nama_perusahaan', event.target.value);
                    if (event.target.value.trim().length > 0) setErrorNama(false);
                  }}
                  placeholder="PT Jaya"
                  aria-invalid={errorNama}
                  style={
                    errorNama
                      ? {
                          borderColor: 'var(--c-danger)',
                          backgroundColor: 'var(--c-danger-soft)',
                        }
                      : undefined
                  }
                  className={kelasInput(errorNama)}
                />
              </label>
              <div className="flex gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[10px] text-ink-muted">Nomor</span>
                  <input
                    value={fakta.nomor_peraturan ?? ''}
                    onChange={(event) => onUbahFakta('nomor_peraturan', event.target.value)}
                    placeholder="01/PP/2026"
                    className={kelasInput(false)}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[10px] text-ink-muted">Tanggal</span>
                  <input
                    type="date"
                    value={fakta.tanggal_berlaku ?? ''}
                    onChange={(event) => onUbahFakta('tanggal_berlaku', event.target.value)}
                    className={kelasInput(false)}
                  />
                </label>
              </div>
              {errorNama && (
                <p className="text-[10.5px] text-danger">
                  Nama perusahaan wajib diisi sebelum menyimpan.
                </p>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <div className="shrink-0 px-5 pt-3.5 text-center">
                <h3 className="text-[14px] font-bold leading-snug text-ink">{judul}</h3>
                <p className="mt-0.5 text-[10.5px] text-ink-muted">
                  Nomor: {nomor || '-'} · Tanggal berlaku: {tanggalTampil}
                </p>
              </div>
              <div className="mx-5 mt-2 h-px shrink-0 bg-line-strong" />
              <textarea
                value={drafTeks}
                onChange={(event) => onUbahDrafTeks(event.target.value)}
                placeholder="Tulis draf di sini…"
                spellCheck={false}
                className="min-h-[120px] w-full flex-1 resize-none bg-transparent px-5 py-2.5 text-[12px] leading-7 text-ink outline-none placeholder:text-line-strong"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
