import type { DokumenPreset } from '../types/api';

/**
 * Id ontologi -> `kode` template YAML di backend.
 *
 * Backend baru punya satu template (`peraturan-perusahaan.yml`), jadi hanya
 * dokumen yang terdaftar di sini yang bisa disusun menjadi draf. Dokumen lain
 * tetap bisa dilihat rujukan pasalnya.
 */
export const KODE_DOKUMEN: Record<string, string> = {
  DokumenPeraturanPerusahaan: 'peraturan_perusahaan',
};

/** `null` berarti draf dokumen tersebut belum tersedia di backend. */
export function kodeDokumen(preset: DokumenPreset | null): string | null {
  if (!preset) return null;
  return KODE_DOKUMEN[preset.id] ?? null;
}

export function bisaDraf(preset: DokumenPreset | null): boolean {
  return kodeDokumen(preset) !== null;
}

/**
 * Topik yang lazim dipakai tiap jenis dokumen.
 *
 * Ini HANYA penanda & urutan chip — bukan penyaring wajib. KB memetakan
 * peraturan (bukan norma) ke dokumen, sehingga satu dokumen ikut menarik
 * norma lintas topik (mis. Surat Cuti membawa pasal PHK). Pasal yang relevan
 * bisa bertopik lain (cuti melahirkan ada di KIA), jadi semua topik tetap
 * bisa dibuka.
 */
export const TOPIK_UTAMA: Record<string, string[]> = {
  DokumenPeraturanPerusahaan: [],
  DokumenSuratCuti: ['Cuti', 'KIA'],
  DokumenSuratPerintahLembur: ['Lembur'],
  DokumenSlipUpah: ['Upah'],
  DokumenPKWT: ['PKWT'],
  DokumenPKWTT: ['PKWT'],
  DokumenSuratPHK: ['PHK'],
  DokumenRPTKA: ['TKA'],
  DokumenPerjanjianAlihDaya: ['AlihDaya'],
  DokumenPendaftaranJamsos: ['Jamsos'],
};

export function topikUtama(preset: DokumenPreset | null): string[] {
  if (!preset) return [];
  return TOPIK_UTAMA[preset.id] ?? [];
}

/** Nama berkas unduhan: "peraturan-perusahaan-pt-maju-jaya.md". */
export function namaBerkas(judul: string, namaPerusahaan?: string): string {
  const dasar = [judul, namaPerusahaan].filter((item) => item && item.trim().length > 0).join(' ');
  const slug = dasar
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'dokumen'}.md`;
}

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** `2026-12-01` -> `1 Desember 2026` (dipakai header dokumen). */
export function formatTanggalPanjang(iso: string): string {
  if (!iso) return '-';
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!cocok) return iso;
  const bulan = BULAN[Number(cocok[2]) - 1];
  if (!bulan) return iso;
  return `${Number(cocok[3])} ${bulan} ${cocok[1]}`;
}

/** Judul dokumen bertemplat: `Peraturan Perusahaan PT X`. */
export function judulDokumen(namaDokumen: string, namaPerusahaan: string): string {
  const bersih = namaPerusahaan.trim();
  return bersih ? `${namaDokumen} ${bersih}` : namaDokumen;
}

/**
 * Entri lama menyimpan draf dari backend (template penuh). Buang baris
 * header-nya agar tidak dobel saat dibuka di editor.
 */
export function badanDrafLama(template: string): string {
  const baris = template.split('\n');
  let mulai = 0;
  if (baris[0]?.startsWith('# ')) {
    let i = 1;
    while (i < baris.length && baris[i].trim() !== '') i += 1;
    while (i < baris.length && baris[i].trim() === '') i += 1;
    mulai = i;
  }
  return baris.slice(mulai).join('\n').trim();
}
