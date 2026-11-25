import { useCallback, useEffect, useState } from 'react';

import { daftarDokumen, hitungPhk, ketentuanDokumen, susunDokumen } from '../services/dokumenService';
import type { ButirKetentuan, DokumenField, DokumenPreset, DokumenResponse } from '../types/api';
import { kodeDokumen } from '../lib/dokumen';
import {
  fieldsPhk,
  hitungKomponen,
  renderSuratPhk,
  validasiSurat,
  type HasilSurat,
  type VarianPhk,
} from '../lib/suratPhk';

/** Ambil `detail` dari galat backend (bentuk FastAPI/Spring yang sama). */
function pesanGalat(err: unknown): string {
  const e = err as { message?: string; detail?: unknown } | null;
  if (e && typeof e.detail === 'string' && e.detail.trim()) return e.detail;
  if (e && Array.isArray(e.detail)) {
    const pesan = e.detail
      .map((item) =>
        item && typeof item === 'object' && 'msg' in item
          ? String((item as { msg?: unknown }).msg ?? '')
          : '',
      )
      .filter(Boolean);
    if (pesan.length > 0) return pesan.join('; ');
  }
  return e?.message ?? 'Terjadi kesalahan.';
}

/**
 * State mode Asistensi Dokumen: daftar jenis dokumen, rujukan pasal untuk
 * dokumen terpilih, isian fakta, dan draf yang sudah tersusun.
 */
export function useDokumen() {
  /** Id sesi kerja dokumen — stabil saat reload, diperbarui oleh New Chat. */
  const [sesiKerja, setSesiKerja] = useState<string>(() => {
    try {
      const tersimpan = window.sessionStorage.getItem('lawkb.sesiDokumen.v1');
      if (tersimpan) return tersimpan;
    } catch {
      /* sessionStorage tidak tersedia */
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem('lawkb.sesiDokumen.v1', sesiKerja);
    } catch {
      /* abaikan */
    }
  }, [sesiKerja]);
  const [presets, setPresets] = useState<DokumenPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DokumenPreset | null>(null);
  const [butir, setButir] = useState<ButirKetentuan[]>([]);
  const [loadingButir, setLoadingButir] = useState(false);
  const [butirError, setButirError] = useState<string | null>(null);

  const [fakta, setFakta] = useState<Record<string, string>>({});
  const [draf, setDraf] = useState<DokumenResponse | null>(null);
  const [loadingDraf, setLoadingDraf] = useState(false);
  const [drafError, setDrafError] = useState<string | null>(null);
  const [ringkasan, setRingkasan] = useState<string | null>(null);
  const [ringkasanTampil, setRingkasanTampil] = useState(false);
  const [ringkasanAwal, setRingkasanAwal] = useState<string | null>(null);
  const [ringkasanDasar, setRingkasanDasar] = useState('');
  const [judul, setJudul] = useState('');
  /** Header (judul + jenis dokumen) ditampilkan di draf dokumen non-PP. */
  const [headerAktif, setHeaderAktif] = useState(false);
  /** Surat PHK: varian, teks surat hasil template, dan ringkasan terpisah. */
  const [varian, setVarian] = useState<VarianPhk>('pemberitahuan');
  const [fieldsSurat, setFieldsSurat] = useState<DokumenField[] | null>(null);
  const [suratTeks, setSuratTeks] = useState('');
  const [ringkasanTeks, setRingkasanTeks] = useState('');
  const [loadingSurat, setLoadingSurat] = useState(false);
  const [suratError, setSuratError] = useState<string | null>(null);
  /** Teks draf yang ditulis user di editor dokumen bertemplat. */
  const [drafTeks, setDrafTeks] = useState('');

  useEffect(() => {
    let hidup = true;
    setLoadingPresets(true);
    daftarDokumen()
      .then((list) => {
        if (hidup) setPresets(list);
      })
      .catch((err) => {
        if (hidup) setPresetsError(pesanGalat(err));
      })
      .finally(() => {
        if (hidup) setLoadingPresets(false);
      });
    return () => {
      hidup = false;
    };
  }, []);

  const idTerpilih = preset?.id;

  useEffect(() => {
    if (!idTerpilih) {
      setButir([]);
      setButirError(null);
      return;
    }
    let hidup = true;
    setLoadingButir(true);
    setButirError(null);
    ketentuanDokumen(idTerpilih)
      .then((list) => {
        if (hidup) setButir(list);
      })
      .catch((err) => {
        if (hidup) {
          setButir([]);
          setButirError(pesanGalat(err));
        }
      })
      .finally(() => {
        if (hidup) setLoadingButir(false);
      });
    return () => {
      hidup = false;
    };
  }, [idTerpilih]);

  /** Draf dari riwayat: pasangkan lagi dengan preset yang cocok. */
  useEffect(() => {
    if (!draf || preset || presets.length === 0) return;
    const cocok = presets.find((item) => kodeDokumen(item) === draf.dokumen);
    if (cocok) setPreset(cocok);
  }, [draf, preset, presets]);

  const pilih = useCallback((next: DokumenPreset) => {
    setPreset(next);
    setDraf(null);
    setDrafError(null);
    setFakta({});
    setRingkasan(null);
    setRingkasanTampil(false);
    setRingkasanAwal(null);
    setRingkasanDasar('');
    setJudul('');
    setHeaderAktif(false);
    setDrafTeks('');
    setVarian('pemberitahuan');
    setFieldsSurat(null);
    setSuratTeks('');
    setRingkasanTeks('');
    setSuratError(null);
  }, []);

  const kembali = useCallback(() => {
    setPreset(null);
    setDraf(null);
    setDrafError(null);
    setFakta({});
    setRingkasan(null);
    setRingkasanTampil(false);
    setRingkasanAwal(null);
    setRingkasanDasar('');
    setJudul('');
    setHeaderAktif(false);
    setDrafTeks('');
    setVarian('pemberitahuan');
    setFieldsSurat(null);
    setSuratTeks('');
    setRingkasanTeks('');
    setSuratError(null);
  }, []);

  const reset = useCallback(() => {
    setPreset(null);
    setButir([]);
    setDraf(null);
    setDrafError(null);
    setFakta({});
    setRingkasan(null);
    setRingkasanTampil(false);
    setRingkasanAwal(null);
    setRingkasanDasar('');
    setJudul('');
    setHeaderAktif(false);
    setDrafTeks('');
    setVarian('pemberitahuan');
    setFieldsSurat(null);
    setSuratTeks('');
    setRingkasanTeks('');
    setSuratError(null);
    setSesiKerja(`${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }, []);

  /** Sesi kerja baru (dipakai saat membuka entri riwayat). */
  const sesiBaru = useCallback(() => {
    setSesiKerja(`${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }, []);

  const ubahFakta = useCallback((nama: string, nilai: string) => {
    setFakta((lama) => ({ ...lama, [nama]: nilai }));
  }, []);

  const ubahJudul = useCallback((nilai: string) => {
    setJudul(nilai);
  }, []);

  const ubahHeaderAktif = useCallback((nilai: boolean) => {
    setHeaderAktif(nilai);
  }, []);

  const ubahDrafTeks = useCallback((nilai: string) => {
    setDrafTeks(nilai);
  }, []);

  const muatDrafTeks = useCallback((nilai: string | undefined) => {
    setDrafTeks(nilai ?? '');
  }, []);

  const muatJudul = useCallback((nilai: string | undefined) => {
    setJudul(nilai ?? '');
  }, []);

  const muatHeader = useCallback((nilai: boolean | undefined) => {
    setHeaderAktif(Boolean(nilai));
  }, []);

  const ubahVarian = useCallback((nilai: VarianPhk) => {
    setVarian(nilai);
    setFieldsSurat(null);
    setSuratTeks('');
    setSuratError(null);
  }, []);

  const ubahSuratTeks = useCallback((nilai: string) => {
    setSuratTeks(nilai);
  }, []);

  const muatSurat = useCallback((nilai: string | undefined) => {
    setSuratTeks(nilai ?? '');
  }, []);

  const ubahRingkasanTeks = useCallback((nilai: string) => {
    setRingkasanTeks(nilai);
  }, []);

  const muatRingkasanTeks = useCallback((nilai: string | undefined) => {
    setRingkasanTeks(nilai ?? '');
  }, []);

  const muatVarian = useCallback((nilai: string | undefined) => {
    setVarian(nilai === 'keputusan' ? 'keputusan' : 'pemberitahuan');
  }, []);

  /** Backend lama menolak kode selain peraturan perusahaan. */
  const backendBelumSiap = (err: unknown): boolean => {
    const e = err as { status?: number; detail?: unknown } | null;
    if (e?.status === 404) return true;
    return (
      e?.status === 422 &&
      String(e.detail ?? '')
        .toLowerCase()
        .includes('tidak didukung')
    );
  };

  /**
   * Susun surat PHK. Memakai `POST /dokumen` bila backend sudah mendukung;
   * selama belum, jatuh ke mock + hitung SWRL lewat `/infer`.
   */
  const susunSurat = useCallback(
    async (sesi: string): Promise<HasilSurat | DokumenResponse | null> => {
      if (!preset) return null;

      const faktaTeks: Record<string, string> = {};
      for (const [kunci, nilai] of Object.entries(fakta)) {
        faktaTeks[kunci] = typeof nilai === 'string' ? nilai : String(nilai ?? '');
      }

      const kurang = validasiSurat(varian, faktaTeks);
      if (kurang.length > 0) {
        setSuratError(`Lengkapi dulu: ${kurang.join(', ')}.`);
        return null;
      }

      setLoadingSurat(true);
      setSuratError(null);
      try {
        const kode =
          varian === 'keputusan' ? 'surat_phk_keputusan' : 'surat_phk_pemberitahuan';
        try {
          const hasil = await susunDokumen({ sesi, dokumen: kode, fakta: faktaTeks });
          setSuratTeks(hasil.template);
          if (hasil.fields && hasil.fields.length > 0) setFieldsSurat(hasil.fields);
          return hasil;
        } catch (err) {
          if (!backendBelumSiap(err)) throw err;

          const infer = await hitungPhk({
            masaKerjaBulan: Number(faktaTeks.masa_kerja_bulan),
            upahBulanan: Number(faktaTeks.upah_bulanan),
            alasanPHK: faktaTeks.alasan_phk,
          });
          const rincian = infer.rincian ?? {};
          const upah = Number(faktaTeks.upah_bulanan);
          const komponen = hitungKomponen(
            upah,
            Number(rincian.pesangon_bulan ?? 0),
            Number(rincian.upmk_bulan ?? 0),
            Number(rincian.total_bulan ?? 0),
          );
          const surat = renderSuratPhk(varian, faktaTeks, komponen);
          setSuratTeks(surat.template);
          setFieldsSurat(fieldsPhk(varian));
          return surat;
        }
      } catch (err) {
        setSuratError(pesanGalat(err));
        return null;
      } finally {
        setLoadingSurat(false);
      }
    },
    [preset, fakta, varian],
  );

  /** Dipakai saat membuka entri riwayat: kembalikan isian yang tersimpan. */
  const muatFakta = useCallback((nilai: Record<string, string> | undefined) => {
    setFakta(nilai ? { ...nilai } : {});
  }, []);

  const susun = useCallback(
    async (sesi: string): Promise<DokumenResponse | null> => {
      if (!preset) return null;
      const kode = kodeDokumen(preset);
      if (!kode) return null;

      setLoadingDraf(true);
      setDrafError(null);
      try {
        const hasil = await susunDokumen({
          sesi,
          dokumen: kode,
          topik: [],
          fakta: {
            nama_perusahaan: (fakta.nama_perusahaan ?? '').trim(),
            nomor_peraturan: (fakta.nomor_peraturan ?? '').trim() || '-',
            tanggal_berlaku: (fakta.tanggal_berlaku ?? '').trim() || '-',
          },
        });
        setDraf(hasil);
        return hasil;
      } catch (err) {
        setDrafError(pesanGalat(err));
        return null;
      } finally {
        setLoadingDraf(false);
      }
    },
    [preset, fakta],
  );

  const muatDraf = useCallback((hasil: DokumenResponse) => {
    setDraf(hasil);
    setDrafError(null);
  }, []);

  const tampilkanRingkasan = useCallback((teks: string, dasar = '') => {
    setRingkasan(teks);
    setRingkasanAwal(teks);
    setRingkasanDasar(dasar);
    setRingkasanTampil(true);
  }, []);

  /** Dipakai saat membuka entri riwayat. */
  const muatRingkasan = useCallback((teks: string, dasar = '') => {
    setRingkasan(teks);
    setRingkasanAwal(teks);
    setRingkasanDasar(dasar);
    setRingkasanTampil(true);
  }, []);

  const ubahRingkasan = useCallback((teks: string) => {
    setRingkasan(teks);
  }, []);

  const bukaRingkasan = useCallback(() => setRingkasanTampil(true), []);
  const sembunyikanRingkasan = useCallback(() => setRingkasanTampil(false), []);

  return {
    presets,
    loadingPresets,
    presetsError,
    preset,
    butir,
    loadingButir,
    butirError,
    fakta,
    draf,
    loadingDraf,
    drafError,
    ringkasan,
    judul,
    headerAktif,
    ubahHeaderAktif,
    muatHeader,
    varian,
    fieldsSurat,
    suratTeks,
    ringkasanTeks,
    loadingSurat,
    suratError,
    ubahVarian,
    ubahSuratTeks,
    muatSurat,
    ubahRingkasanTeks,
    muatRingkasanTeks,
    muatVarian,
    susunSurat,
    sesiKerja,
    sesiBaru,
    pilih,
    kembali,
    reset,
    ubahFakta,
    ubahJudul,
    muatJudul,
    drafTeks,
    ubahDrafTeks,
    muatDrafTeks,
    muatFakta,
    susun,
    muatDraf,
    ringkasanTampil,
    ringkasanAwal,
    ringkasanDasar,
    tampilkanRingkasan,
    muatRingkasan,
    ubahRingkasan,
    bukaRingkasan,
    sembunyikanRingkasan,
  };
}

export type DokumenApi = ReturnType<typeof useDokumen>;
