import { useEffect, useMemo, useRef, useState } from 'react';

import { kunciButir, useChecklist } from '../../hooks/useChecklist';
import { cx } from '../../lib/cx';
import { bisaDraf, formatTanggalPanjang, judulDokumen, namaBerkas } from '../../lib/dokumen';
import { susunRingkasan } from '../../lib/ringkasan';
import { labelManusia } from '../../lib/text';
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
  judul: string;
  onUbahJudul: (nilai: string) => void;
  /** Header (judul + jenis dokumen) aktif — hanya untuk dokumen non-PP. */
  headerAktif: boolean;
  onUbahHeader: (nilai: boolean) => void;
  sesiChecklist: string | null;
  awalChecklist?: readonly string[] | null;
  onSimpan: (pasal: string[]) => void;
  onKembali: () => void;
  /** Cuplikan entri tersimpan untuk menghitung status "ada perubahan". */
  entriTersimpan?: {
    fakta: Record<string, string>;
    drafTeks: string;
    pasal?: string[];
    judul?: string;
    header?: boolean;
  } | null;
};

const kunciFakta = (fakta: Record<string, string>): string =>
  JSON.stringify(
    Object.entries(fakta)
      .filter(([, nilai]) => nilai.trim().length > 0)
      .sort(),
  );

const kunciPasal = (pasal: Iterable<string>): string => [...pasal].sort().join('\n');

/**
 * Workspace dokumen: rujukan pasal + checklist di kiri, draf/notes di kanan.
 *
 * - Peraturan Perusahaan: field nama PT/nomor/tanggal + draf bertemplat.
 * - Dokumen lain: field judul + notes bebas; ringkasan pasal bisa dibuat
 *   dari pasal yang dicentang lalu diedit sebagai notes.
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
  judul,
  onUbahJudul,
  headerAktif,
  onUbahHeader,
  sesiChecklist,
  awalChecklist,
  onSimpan,
  onKembali,
  entriTersimpan,
}: Props) {
  const template = bisaDraf(preset);
  const nama = (fakta.nama_perusahaan ?? '').trim();
  const nomor = (fakta.nomor_peraturan ?? '').trim();
  const tanggal = (fakta.tanggal_berlaku ?? '').trim();

  const judulEfektif = template
    ? judulDokumen(preset.nama, nama)
    : judul.trim() || preset.nama;
  const tanggalTampil = formatTanggalPanjang(tanggal);

  const checklist = useChecklist(sesiChecklist, awalChecklist);
  const terpilih = useMemo(
    () => butir.filter((item) => checklist.ditandai.has(kunciButir(item))),
    [butir, checklist.ditandai],
  );

  const [errorNama, setErrorNama] = useState(false);
  const [errorJudul, setErrorJudul] = useState(false);
  const [goyang, setGoyang] = useState(0);
  const inputNama = useRef<HTMLInputElement>(null);
  const inputJudul = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<'idle' | 'tersalin' | 'gagal'>('idle');

  useEffect(() => {
    if (goyang === 0) return;
    const timer = window.setTimeout(() => setGoyang(0), 400);
    return () => window.clearTimeout(timer);
  }, [goyang]);

  const adaPerubahan = useMemo(() => {
    if (entriTersimpan) {
      const pasalSama =
        kunciPasal(checklist.ditandai) === kunciPasal(entriTersimpan.pasal ?? []);
      if (template) {
        return (
          kunciFakta(fakta) !== kunciFakta(entriTersimpan.fakta) ||
          drafTeks !== entriTersimpan.drafTeks ||
          !pasalSama
        );
      }
      return (
        judul.trim() !== (entriTersimpan.judul ?? '').trim() ||
        (entriTersimpan.header ?? false) !== headerAktif ||
        drafTeks !== entriTersimpan.drafTeks ||
        !pasalSama
      );
    }

    const adaIsi = drafTeks.trim().length > 0 || checklist.ditandai.size > 0;
    return template
      ? adaIsi || [nama, nomor, tanggal].some((nilai) => nilai.length > 0)
      : adaIsi || judul.trim().length > 0;
  }, [
    checklist.ditandai,
    drafTeks,
    entriTersimpan,
    fakta,
    headerAktif,
    judul,
    nama,
    nomor,
    tanggal,
    template,
  ]);

  const teksDokumen = () => {
    const badan = drafTeks.trim();
    if (template) {
      const kepala = `# ${judulEfektif}\nNomor: ${nomor || '-'} — Tanggal berlaku: ${tanggalTampil}`;
      return badan ? `${kepala}\n\n${badan}` : kepala;
    }
    if (!headerAktif) return badan;
    if (badan.startsWith('#')) return badan;
    const kepala = `# ${judulEfektif}\nJenis dokumen: ${preset.nama}`;
    return badan ? `${kepala}\n\n${badan}` : kepala;
  };

  const simpan = () => {
    if (template && !nama) {
      setErrorNama(true);
      setGoyang((nilai) => nilai + 1);
      inputNama.current?.focus();
      return;
    }
    if (!template && !judul.trim()) {
      setErrorJudul(true);
      setGoyang((nilai) => nilai + 1);
      inputJudul.current?.focus();
      return;
    }
    onSimpan([...checklist.ditandai]);
  };

  const sisipkan = () => {
    if (terpilih.length === 0) return;

    if (template) {
      // Hanya pasal yang belum ada di draf — supaya klik berulang tidak
      // menduplikasi baris, dan blok baru berisi "sisipan yang lain" saja.
      const baru = terpilih
        .map((item) => `- ${item.pasal} — ${labelManusia(item.jenis)}`)
        .filter((baris) => !drafTeks.includes(baris));
      if (baru.length === 0) return;
      const bagian = `[Dasar Hukum]\n${baru.join('\n')}`;
      // Tempel langsung di baris berikutnya — tanpa baris kosong tambahan.
      const isi = drafTeks.replace(/\s+$/, '');
      onUbahDrafTeks(isi ? `${isi}\n${bagian}` : bagian);
      return;
    }

    const ringkas = susunRingkasan(judulEfektif, preset.nama, butir, checklist.ditandai);
    const badan = ringkas.replace(/^# .+\n+/, '');
    if (
      drafTeks.trim().length > 0 &&
      !window.confirm('Ganti isi draf dengan ringkasan pasal terpilih?')
    ) {
      return;
    }
    onUbahDrafTeks(badan);
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
    tautan.download = namaBerkas(preset.nama, template ? nama : judul.trim());
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

  const labelAksi = template ? 'Sisipkan pasal terpilih' : 'Buat ringkasan dari pasal terpilih';

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
              sembunyikanJenis
              ditandai={checklist.ditandai}
              onToggle={checklist.toggle}
              onTandaiBanyak={checklist.tandaiBanyak}
              onHapusSemua={checklist.hapusSemua}
            />
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <header className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line bg-surface-muted px-3 py-1.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Draf
              </h2>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={sisipkan}
                  disabled={terpilih.length === 0}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-[11px] transition',
                    terpilih.length === 0
                      ? 'cursor-not-allowed border-line bg-surface text-ink-muted opacity-50'
                      : 'border-line-strong bg-surface font-medium text-ink hover:border-navy-soft hover:bg-navy-soft',
                  )}
                >
                  {labelAksi} ({terpilih.length})
                </button>
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
                  Simpan
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
              {template ? (
                <>
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
                </>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-ink-muted">
                    Judul dokumen <span className="text-danger">*</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputJudul}
                      value={judul}
                      onChange={(event) => {
                        onUbahJudul(event.target.value);
                        if (event.target.value.trim().length > 0) setErrorJudul(false);
                      }}
                      placeholder="Surat Pemberitahuan PHK — Budi"
                      aria-label="Judul dokumen"
                      aria-invalid={errorJudul}
                      style={
                        errorJudul
                          ? {
                              borderColor: 'var(--c-danger)',
                              backgroundColor: 'var(--c-danger-soft)',
                            }
                          : undefined
                      }
                      className={kelasInput(errorJudul)}
                    />
                    <button
                      type="button"
                      onClick={() => onUbahHeader(!headerAktif)}
                      aria-pressed={headerAktif}
                      title={
                        headerAktif
                          ? 'Sembunyikan judul dan jenis dokumen dari draf'
                          : 'Tampilkan judul dan jenis dokumen di atas draf'
                      }
                      className={cx(
                        'h-6 shrink-0 rounded-md border px-2 text-[10.5px] font-medium transition',
                        headerAktif
                          ? 'border-navy-soft bg-navy-soft text-navy hover:border-navy'
                          : 'border-line-strong bg-surface text-ink-muted hover:border-navy-soft hover:text-ink',
                      )}
                    >
                      {headerAktif ? 'Sembunyikan Header' : 'Aktifkan Header'}
                    </button>
                  </div>
                  {errorJudul && (
                    <span className="text-[10.5px] text-danger">
                      Judul dokumen wajib diisi sebelum menyimpan.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              {(template || headerAktif) && (
                <>
                  <div className="shrink-0 px-5 pt-3.5 text-center">
                    <h3 className="text-[14px] font-bold leading-snug text-ink">
                      {judulEfektif}
                    </h3>
                    <p className="mt-0.5 text-[10.5px] text-ink-muted">
                      {template
                        ? `Nomor: ${nomor || '-'} — Tanggal berlaku: ${tanggalTampil}`
                        : `Jenis dokumen: ${preset.nama}`}
                    </p>
                  </div>
                  <div className="mx-5 mt-2 h-px shrink-0 bg-line-strong" />
                </>
              )}
              <textarea
                value={drafTeks}
                onChange={(event) => onUbahDrafTeks(event.target.value)}
                placeholder={
                  template
                    ? 'Tulis draf di sini…'
                    : 'Tulis catatan atau ringkasan di sini…'
                }
                spellCheck={false}
                className={cx(
                  'min-h-[120px] w-full flex-1 resize-none bg-transparent px-5 py-2.5 text-[12px] leading-7 text-ink outline-none placeholder:text-line-strong',
                  !template && !headerAktif && 'pt-4',
                )}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
