import { useEffect, useMemo, useRef, useState } from 'react';

import { kunciButir, useChecklist } from '../../hooks/useChecklist';
import { bisaDraf, topikUtama } from '../../lib/dokumen';
import { susunRingkasan } from '../../lib/ringkasan';
import { cx } from '../../lib/cx';
import type { ButirKetentuan, DokumenPreset, DokumenResponse } from '../../types/api';
import ErrorCard from '../cards/ErrorCard';
import DokumenDrafCard from './DokumenDrafCard';
import DokumenFaktaForm from './DokumenFaktaForm';
import DokumenKetentuanList from './DokumenKetentuanList';
import DokumenRingkasanCard from './DokumenRingkasanCard';

type Props = {
  preset: DokumenPreset;
  butir: ButirKetentuan[];
  loadingButir: boolean;
  butirError?: string | null;
  fakta: Record<string, string>;
  onUbahFakta: (nama: string, nilai: string) => void;
  onSusun: () => void;
  loadingDraf: boolean;
  drafError?: string | null;
  draf: DokumenResponse | null;
  onKembali: () => void;
  /** Ringkasan yang sedang ditampilkan (null = belum dibuat). */
  ringkasan?: string | null;
  /** Apakah kartu ringkasan sedang tampil. */
  ringkasanTampil?: boolean;
  /** Teks ringkasan hasil susun otomatis (baseline untuk deteksi editan). */
  ringkasanAwal?: string | null;
  /** Sidik jari centang saat ringkasan disusun. */
  ringkasanDasar?: string;
  onBuatRingkasan: (
    teks: string,
    jumlahTanda: number,
    pasal: string[],
    judul: string,
    dasar: string,
  ) => void;
  onUbahRingkasan: (teks: string) => void;
  onBukaRingkasan: () => void;
  onSembunyikanRingkasan: () => void;
  /** Judul pekerjaan — wajib untuk dokumen tanpa templat. */
  judul: string;
  onUbahJudul: (nilai: string) => void;
  /** Kunci centang sesi ini (`sesiKerja:jenisDokumen`). */
  sesiChecklist: string | null;
  /** Centang awal saat membuka entri riwayat. */
  awalChecklist?: string[] | null;
  /** Simpan keadaan halaman ini ke riwayat (tanpa perlu draf/ringkasan). */
  onSimpan: (jumlahTanda: number, pasal: string[], judul: string) => void;
  /** Cuplikan entri yang sudah tersimpan (null = belum pernah disimpan). */
  entriTersimpan?: {
    judul: string;
    pasal: string[];
    fakta: Record<string, string>;
    ringkasan: string | null;
    drafTemplate: string | null;
  } | null;
};

/**
 * Panel dokumen setelah user memilih jenisnya: judul pekerjaan, isian (bila
 * ada template), draf, daftar rujukan pasal, dan ringkasan pasal bertanda.
 */
export default function DokumenPanel({
  preset,
  butir,
  loadingButir,
  butirError,
  fakta,
  onUbahFakta,
  onSusun,
  loadingDraf,
  drafError,
  draf,
  onKembali,
  ringkasan,
  ringkasanTampil,
  ringkasanAwal,
  ringkasanDasar,
  onBuatRingkasan,
  onUbahRingkasan,
  onBukaRingkasan,
  onSembunyikanRingkasan,
  judul,
  onUbahJudul,
  sesiChecklist,
  awalChecklist,
  onSimpan,
  entriTersimpan,
}: Props) {
  const siap = bisaDraf(preset);
  /** Setelah draf ada, form diringkas agar tabel tetap kebagian ruang. */
  const [ubahData, setUbahData] = useState(false);
  const { ditandai, toggle, hapusSemua } = useChecklist(sesiChecklist, awalChecklist);

  const [errorJudul, setErrorJudul] = useState(false);
  const [goyang, setGoyang] = useState(0);
  const inputJudul = useRef<HTMLInputElement>(null);

  const [errorNama, setErrorNama] = useState(false);
  const [goyangNama, setGoyangNama] = useState(0);
  const inputNama = useRef<HTMLInputElement>(null);

  /** Dokumen bertemplat memakai nama perusahaan sebagai identitas judul. */
  const judulOtomatis = siap;
  const namaPerusahaan = (fakta.nama_perusahaan ?? '').trim();
  const judulEfektif = judulOtomatis
    ? namaPerusahaan
      ? `${preset.nama} — ${namaPerusahaan}`
      : ''
    : judul.trim();

  useEffect(() => {
    if (goyang === 0) return;
    const timer = window.setTimeout(() => setGoyang(0), 400);
    return () => window.clearTimeout(timer);
  }, [goyang]);

  useEffect(() => {
    if (goyangNama === 0) return;
    const timer = window.setTimeout(() => setGoyangNama(0), 400);
    return () => window.clearTimeout(timer);
  }, [goyangNama]);

  const jumlahTanda = useMemo(
    () => butir.filter((item) => ditandai.has(kunciButir(item))).length,
    [butir, ditandai],
  );

  /** Sidik jari centang — untuk tahu apakah ringkasan perlu disusun ulang. */
  const dasarSekarang = useMemo(() => [...ditandai].sort().join('\n'), [ditandai]);

  /** Apakah ada perubahan dibanding entri yang sudah disimpan. */
  const adaPerubahan = useMemo(() => {
    if (!entriTersimpan) return true;
    const pasalSekarang = dasarSekarang;
    const pasalTersimpan = [...entriTersimpan.pasal].sort().join('\n');
    const faktaSekarang = JSON.stringify(Object.entries(fakta).sort());
    const faktaTersimpan = JSON.stringify(Object.entries(entriTersimpan.fakta).sort());
    return (
      entriTersimpan.judul !== judulEfektif ||
      pasalSekarang !== pasalTersimpan ||
      faktaSekarang !== faktaTersimpan ||
      (entriTersimpan.ringkasan ?? null) !== (ringkasan ?? null) ||
      (entriTersimpan.drafTemplate ?? null) !== (draf?.template ?? null)
    );
  }, [entriTersimpan, dasarSekarang, fakta, judulEfektif, ringkasan, draf]);

  const ringkasData = [
    (fakta.nama_perusahaan ?? '').trim(),
    (fakta.nomor_peraturan ?? '').trim(),
    (fakta.tanggal_berlaku ?? '').trim(),
  ]
    .filter(Boolean)
    .join(' · ');

  /** Judul wajib; dokumen bertemplat memakai nama perusahaan. */
  const cekJudiul = (): boolean => {
    if (judulOtomatis) {
      if (namaPerusahaan.length > 0) return true;
      setErrorNama(true);
      setGoyangNama((nilai) => nilai + 1);
      inputNama.current?.focus();
      return false;
    }
    if (judul.trim().length > 0) return true;
    setErrorJudul(true);
    setGoyang((nilai) => nilai + 1);
    inputJudul.current?.focus();
    return false;
  };

  const simpan = () => {
    if (!cekJudiul()) return;
    onSimpan(jumlahTanda, [...ditandai], judulEfektif);
  };

  const buatRingkasan = () => {
    if (!cekJudiul()) return;

    // Ringkasan sudah ada: putuskan apakah perlu disusun ulang.
    if (ringkasan) {
      const centangBerubah = dasarSekarang !== (ringkasanDasar ?? '');
      if (!centangBerubah) {
        onBukaRingkasan();
        return;
      }
      const sudahDiedit = ringkasan !== (ringkasanAwal ?? '');
      if (
        sudahDiedit &&
        !window.confirm(
          'Ringkasan akan disusun ulang dan catatan Anda hilang. Lanjut?',
        )
      ) {
        return;
      }
    }

    const teks = susunRingkasan(judulEfektif, preset.nama, butir, ditandai);
    onBuatRingkasan(teks, jumlahTanda, [...ditandai], judulEfektif, dasarSekarang);
  };

  /** Kembali dari ringkasan: peringatkan bila catatan belum disimpan. */
  const kembaliRingkasan = () => {
    const belumDisimpan = (entriTersimpan?.ringkasan ?? null) !== (ringkasan ?? null);
    if (
      belumDisimpan &&
      !window.confirm('Catatan belum disimpan. Tetap kembali?')
    ) {
      return;
    }
    onSembunyikanRingkasan();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full min-h-0 max-w-5xl flex-1 flex-col gap-2.5 px-6 py-4">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onKembali}
            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-muted transition hover:border-navy-soft hover:text-ink"
          >
            ← Ganti dokumen
          </button>
          <h2 className="text-[17px] font-semibold text-ink">{preset.nama}</h2>
          <span
            className={
              siap
                ? 'rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-medium text-gold-text'
                : 'rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted'
            }
          >
            {siap ? 'Draf tersedia' : 'Rujukan pasal'}
          </span>
          {!ringkasanTampil && (
            <button
              type="button"
              onClick={simpan}
              title={adaPerubahan ? 'Simpan halaman ini ke riwayat' : 'Sudah tersimpan — klik untuk menyimpan ulang'}
              className={
                adaPerubahan
                  ? 'ml-auto rounded-lg bg-navy px-2.5 py-1 text-[11.5px] font-medium text-ink-inverse transition hover:bg-navy-hover'
                  : 'ml-auto rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-muted transition hover:border-navy-soft hover:text-ink'
              }
            >
              {adaPerubahan ? 'Simpan' : 'Tersimpan'}
            </button>
          )}
        </div>

        {judulOtomatis ? null : ringkasanTampil ? (
          <p className="shrink-0 text-[11.5px] text-ink-muted">
            Judul: <span className="text-ink">{judulEfektif}</span>
          </p>
        ) : (
          <div className="flex shrink-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <label htmlFor="judul-pekerjaan" className="shrink-0 text-[11px] text-ink-muted">
                Judul <span className="text-danger">*</span>
              </label>
              <input
                id="judul-pekerjaan"
                ref={inputJudul}
                value={judul}
                onChange={(event) => {
                  onUbahJudul(event.target.value);
                  if (event.target.value.trim().length > 0) setErrorJudul(false);
                }}
                placeholder="Masukkan judul dokumen"
                aria-invalid={errorJudul}
                style={
                  errorJudul
                    ? {
                        borderColor: 'var(--c-danger)',
                        backgroundColor: 'var(--c-danger-soft)',
                      }
                    : undefined
                }
                className={cx(
                  'min-w-0 flex-1 rounded-lg border px-2.5 py-1 text-[12.5px] text-ink outline-none transition',
                  errorJudul
                    ? 'placeholder:text-danger/70'
                    : 'border-line-strong bg-surface placeholder:text-ink-muted focus:border-navy-light',
                  goyang > 0 && 'goyang',
                )}
              />
            </div>
            {errorJudul && (
              <p className="pl-[46px] text-[10.5px] text-danger">Judul wajib diisi.</p>
            )}
          </div>
        )}

        {siap && (!draf || ubahData) && (
          <DokumenFaktaForm
            preset={preset}
            fakta={fakta}
            onUbah={(namaField, nilai) => {
              onUbahFakta(namaField, nilai);
              if (namaField === 'nama_perusahaan' && nilai.trim().length > 0) {
                setErrorNama(false);
              }
            }}
            onSusun={onSusun}
            loading={loadingDraf}
            errorNama={errorNama}
            goyangNama={goyangNama > 0}
            namaRef={inputNama}
          />
        )}

        {siap && draf && !ubahData && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 shadow-card">
            <span className="text-[12px] text-ink-muted">
              Data: <span className="text-ink">{ringkasData || '—'}</span>
            </span>
            <button
              type="button"
              onClick={() => setUbahData(true)}
              className="text-[11.5px] font-medium text-navy hover:underline"
            >
              Ubah data
            </button>
          </div>
        )}

        {drafError && (
          <div className="shrink-0">
            <ErrorCard pesan={drafError} />
          </div>
        )}

        {draf && <DokumenDrafCard draf={draf} namaPerusahaan={fakta.nama_perusahaan} />}

        {ringkasan && ringkasanTampil ? (
          <DokumenRingkasanCard
            teks={ringkasan}
            judul={judulEfektif || preset.nama}
            onUbah={onUbahRingkasan}
            onSimpan={simpan}
            tersimpan={(entriTersimpan?.ringkasan ?? null) === ringkasan}
            onTutup={kembaliRingkasan}
          />
        ) : (
          <DokumenKetentuanList
            butir={butir}
            loading={loadingButir}
            error={butirError}
            topikUtama={topikUtama(preset)}
            ditandai={ditandai}
            onToggle={toggle}
            onHapusSemua={hapusSemua}
            onBuatRingkasan={buatRingkasan}
          />
        )}
      </div>
    </div>
  );
}
