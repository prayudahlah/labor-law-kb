import { useMemo, useState } from 'react';

import { kunciButir, useChecklist } from '../../hooks/useChecklist';
import { cx } from '../../lib/cx';
import { namaBerkas } from '../../lib/dokumen';
import { susunRingkasan } from '../../lib/ringkasan';
import {
  LABEL_VARIAN,
  fieldsPhk,
  validasiSurat,
  type VarianPhk,
} from '../../lib/suratPhk';
import type { ButirKetentuan, DokumenField, DokumenPreset } from '../../types/api';
import { IconCopy, IconDownload } from '../common/icons';
import DokumenKetentuanList from './DokumenKetentuanList';

type Props = {
  preset: DokumenPreset;
  butir: ButirKetentuan[];
  loadingButir: boolean;
  butirError?: string | null;
  fakta: Record<string, string>;
  onUbahFakta: (nama: string, nilai: string) => void;
  varian: VarianPhk;
  onUbahVarian: (nilai: VarianPhk) => void;
  fieldsSurat: DokumenField[] | null;
  suratTeks: string;
  onUbahSurat: (nilai: string) => void;
  ringkasan: string;
  onUbahRingkasan: (nilai: string) => void;
  loadingSurat: boolean;
  suratError?: string | null;
  onSusunSurat: () => Promise<boolean>;
  sesiChecklist: string | null;
  awalChecklist?: readonly string[] | null;
  onSimpan: (pasal: string[]) => void;
  onKembali: () => void;
  entriTersimpan?: {
    fakta: Record<string, string>;
    suratTeks: string;
    ringkasan: string;
    pasal?: string[];
    varian?: string;
    judul?: string;
  } | null;
};

type Tampilan = 'form' | 'surat' | 'ringkasan';

const kelasInput =
  'w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-[12px] text-ink outline-none transition focus:border-navy-light';

/**
 * Workspace Surat PHK: checklist pasal + ringkasan di kiri, form dan surat
 * di kanan.
 *
 * SEMENTARA: field & teks surat masih dari mock `lib/suratPhk.ts` sampai
 * `POST /dokumen` backend mendukung kode surat PHK.
 */
export default function SuratPhkEditor({
  preset,
  butir,
  loadingButir,
  butirError,
  fakta,
  onUbahFakta,
  varian,
  onUbahVarian,
  fieldsSurat,
  suratTeks,
  onUbahSurat,
  ringkasan,
  onUbahRingkasan,
  loadingSurat,
  suratError,
  onSusunSurat,
  sesiChecklist,
  awalChecklist,
  onSimpan,
  onKembali,
}: Props) {
  const checklist = useChecklist(sesiChecklist, awalChecklist);
  const [tampilan, setTampilan] = useState<Tampilan>(() =>
    suratTeks.trim() ? 'surat' : ringkasan.trim() ? 'ringkasan' : 'form',
  );
  const [pesan, setPesan] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'tersalin' | 'gagal'>('idle');

  const terpilih = useMemo(
    () => butir.filter((item) => checklist.ditandai.has(kunciButir(item))),
    [butir, checklist.ditandai],
  );

  const fields = fieldsSurat ?? fieldsPhk(varian);
  const adaRingkasan = ringkasan.trim().length > 0;
  const namaPekerja = (fakta.nama_pekerja ?? '').trim();
  const judulEntri = namaPekerja ? `Surat PHK — ${namaPekerja}` : preset.nama;

  const susun = async () => {
    const kurang = validasiSurat(varian, fakta);
    if (kurang.length > 0) {
      setPesan(kurang);
      return;
    }
    setPesan([]);
    const berhasil = await onSusunSurat();
    if (berhasil) setTampilan('surat');
  };

  const susunUlang = async () => {
    if (
      suratTeks.trim().length > 0 &&
      !window.confirm('Susun ulang surat? Teks yang sudah diedit akan ditimpa.')
    ) {
      return;
    }
    await susun();
  };

  const buatRingkasan = () => {
    if (terpilih.length === 0) return;
    if (
      adaRingkasan &&
      !window.confirm('Perbarui ringkasan? Teks yang sudah diedit akan ditimpa.')
    ) {
      return;
    }
    const teks = susunRingkasan(judulEntri, preset.nama, butir, checklist.ditandai, true);
    onUbahRingkasan(teks);
    setTampilan('ringkasan');
  };

  const gantiVarian = (next: VarianPhk) => {
    if (next === varian) return;
    if (
      suratTeks.trim().length > 0 &&
      !window.confirm('Ganti varian? Draf surat akan dikosongkan.')
    ) {
      return;
    }
    onUbahVarian(next);
    setPesan([]);
    setTampilan('form');
  };

  const salin = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      setStatus('tersalin');
    } catch {
      setStatus('gagal');
    }
    window.setTimeout(() => setStatus('idle'), 2000);
  };

  const unduh = (teks: string) => {
    const blob = new Blob([teks], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = namaBerkas(
      varian === 'keputusan' ? 'surat-keputusan-phk' : 'surat-pemberitahuan-phk',
      namaPekerja || (fakta.nama_perusahaan ?? ''),
    );
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    URL.revokeObjectURL(url);
  };

  const tombolAksi = (teks: string) => (
    <>
      <button
        type="button"
        onClick={() => void salin(teks)}
        className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
      >
        <IconCopy className="h-3 w-3" />
        {status === 'tersalin' ? 'Tersalin' : status === 'gagal' ? 'Gagal' : 'Salin'}
      </button>
      <button
        type="button"
        onClick={() => unduh(teks)}
        className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
      >
        <IconDownload className="h-3 w-3" />
        Unduh
      </button>
      <button
        type="button"
        onClick={() => onSimpan([...checklist.ditandai])}
        className="rounded-lg border border-navy bg-navy px-2.5 py-1 text-[11px] font-semibold text-ink-inverse transition hover:bg-navy-hover"
      >
        Simpan
      </button>
    </>
  );

  const judulTampilan =
    tampilan === 'ringkasan' ? 'Ringkasan pasal' : tampilan === 'surat' ? 'Draf surat' : 'Isi data';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col gap-2 px-6 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold text-ink">
            {varian === 'keputusan' ? 'Surat Keputusan PHK' : preset.nama}
          </h1>
          <button
            type="button"
            onClick={onKembali}
            className="ml-auto rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-muted transition hover:border-navy-soft hover:text-ink"
          >
            ← Kembali
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
          <div className="flex min-h-0 basis-[44%] flex-col gap-2 lg:basis-[52%]">
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

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={buatRingkasan}
                  disabled={terpilih.length === 0}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-[11px] transition',
                    terpilih.length === 0
                      ? 'cursor-not-allowed border-line bg-surface text-ink-muted opacity-50'
                      : 'border-line-strong bg-surface font-medium text-ink hover:border-navy-soft hover:bg-navy-soft',
                  )}
                >
                  {adaRingkasan ? 'Perbarui ringkasan' : 'Buat ringkasan'} ({terpilih.length})
                </button>
                {adaRingkasan && (
                  <button
                    type="button"
                    onClick={() => setTampilan('ringkasan')}
                    className={cx(
                      'rounded-lg border px-2.5 py-1 text-[11px] transition',
                      tampilan === 'ringkasan'
                        ? 'border-navy bg-navy font-semibold text-ink-inverse'
                        : 'border-line-strong bg-surface font-medium text-ink hover:border-navy-soft hover:bg-navy-soft',
                    )}
                  >
                    Lihat ringkasan
                  </button>
                )}
                <span className="ml-auto text-[10.5px] text-ink-muted">
                  {terpilih.length} pasal dipilih
                </span>
              </div>
            </div>
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <header className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line bg-surface-muted px-3 py-1.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {judulTampilan}
              </h2>

              <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5">
                {(Object.keys(LABEL_VARIAN) as VarianPhk[]).map((nilai) => (
                  <button
                    key={nilai}
                    type="button"
                    onClick={() => gantiVarian(nilai)}
                    className={cx(
                      'rounded-md px-2 py-0.5 text-[10.5px] font-medium transition',
                      varian === nilai
                        ? 'bg-navy text-ink-inverse'
                        : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {LABEL_VARIAN[nilai]}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {tampilan === 'surat' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTampilan('form')}
                      className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
                    >
                      Kembali ke form
                    </button>
                    <button
                      type="button"
                      onClick={() => void susunUlang()}
                      disabled={loadingSurat}
                      className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft disabled:opacity-50"
                    >
                      {loadingSurat ? 'Menyusun…' : 'Susun ulang'}
                    </button>
                    {tombolAksi(suratTeks)}
                  </>
                )}
                {tampilan === 'ringkasan' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTampilan(suratTeks ? 'surat' : 'form')}
                      className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
                    >
                      {suratTeks ? 'Lihat draf' : 'Kembali ke form'}
                    </button>
                    {tombolAksi(ringkasan)}
                  </>
                )}
                {tampilan === 'form' && adaRingkasan && (
                  <button
                    type="button"
                    onClick={() => setTampilan('ringkasan')}
                    className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
                  >
                    Lihat ringkasan
                  </button>
                )}
              </div>
            </header>

            {tampilan === 'form' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {fields.map((field) => {
                      const nilai = fakta[field.key] ?? '';
                      const lebar =
                        field.tipe === 'textarea' ? 'sm:col-span-2' : 'sm:col-span-1';
                      return (
                        <label key={field.key} className={cx('flex flex-col gap-0.5', lebar)}>
                          <span className="text-[10px] text-ink-muted">
                            {field.label}
                            {field.wajib && <span className="text-danger"> *</span>}
                          </span>
                          {field.tipe === 'select' ? (
                            <select
                              value={nilai}
                              aria-label={field.label}
                              onChange={(event) => onUbahFakta(field.key, event.target.value)}
                              className={kelasInput}
                            >
                              <option value="">Pilih…</option>
                              {field.pilihan.map((pilihan) => (
                                <option key={pilihan.nilai} value={pilihan.nilai}>
                                  {pilihan.label}
                                </option>
                              ))}
                            </select>
                          ) : field.tipe === 'textarea' ? (
                            <textarea
                              rows={2}
                              value={nilai}
                              placeholder={field.placeholder}
                              aria-label={field.label}
                              onChange={(event) => onUbahFakta(field.key, event.target.value)}
                              className={cx(kelasInput, 'resize-none')}
                            />
                          ) : (
                            <input
                              type={
                                field.tipe === 'number'
                                  ? 'number'
                                  : field.tipe === 'date'
                                    ? 'date'
                                    : 'text'
                              }
                              value={nilai}
                              placeholder={field.placeholder}
                              aria-label={field.label}
                              onChange={(event) => onUbahFakta(field.key, event.target.value)}
                              className={kelasInput}
                            />
                          )}
                          {field.bantuan && (
                            <span className="text-[10px] text-ink-muted">{field.bantuan}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {pesan.length > 0 && (
                    <div className="mt-3 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-[11px] text-danger">
                      Lengkapi dulu: {pesan.join(', ')}.
                    </div>
                  )}

                  {suratError && (
                    <p className="mt-3 text-[11px] text-danger">{suratError}</p>
                  )}
                </div>

                <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2">
                  <p className="text-[10.5px] text-ink-muted">
                    Angka pesangon dihitung otomatis dari KB (SWRL).
                  </p>
                  <button
                    type="button"
                    onClick={() => void susun()}
                    disabled={loadingSurat}
                    className="ml-auto rounded-lg border border-navy bg-navy px-3 py-1 text-[11px] font-semibold text-ink-inverse transition hover:bg-navy-hover disabled:opacity-60"
                  >
                    {loadingSurat ? 'Menyusun…' : 'Susun surat'}
                  </button>
                </footer>
              </div>
            )}

            {tampilan === 'surat' && (
              <div className="flex min-h-0 flex-1 flex-col">
                {suratTeks.trim() ? (
                  <textarea
                    value={suratTeks}
                    onChange={(event) => onUbahSurat(event.target.value)}
                    spellCheck={false}
                    className="min-h-0 flex-1 resize-none bg-transparent px-5 py-3 font-mono text-[11.5px] leading-6 text-ink outline-none"
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                    <p className="text-[12px] text-ink-muted">
                      Surat belum disusun. Isi data lalu klik Susun surat.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTampilan('form')}
                      className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink"
                    >
                      Ke form
                    </button>
                  </div>
                )}
              </div>
            )}

            {tampilan === 'ringkasan' && (
              <div className="flex min-h-0 flex-1 flex-col">
                {adaRingkasan ? (
                  <textarea
                    value={ringkasan}
                    onChange={(event) => onUbahRingkasan(event.target.value)}
                    spellCheck={false}
                    className="min-h-0 flex-1 resize-none bg-transparent px-5 py-3 font-mono text-[11.5px] leading-6 text-ink outline-none"
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                    <p className="text-[12px] text-ink-muted">
                      Belum ada ringkasan. Centang pasal lalu klik Buat ringkasan.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
