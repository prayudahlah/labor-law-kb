import type { DokumenPreset } from '../types/api';

/**
 * Pencocokan kata kunci sederhana untuk halaman pilih dokumen.
 *
 * Bukan pemahaman bahasa: hanya tokenisasi + sinonim kecil, lalu skor
 * kecocokan pada nama (bobot 3) dan deskripsi (bobot 1). Cukup untuk 10
 * dokumen dan hasilnya bisa diprediksi.
 */

/** Kata yang terlalu umum pada nama/deskripsi dokumen. */
const STOPWORD = new Set([
  'saya',
  'aku',
  'mau',
  'ingin',
  'buat',
  'bikin',
  'untuk',
  'yang',
  'dan',
  'atau',
  'di',
  'ke',
  'dari',
  'dengan',
  'sebuah',
  'seorang',
  'karyawan',
  'pekerja',
  'surat',
  'dokumen',
  'form',
  'format',
  'contoh',
  'tolong',
  'minta',
]);

/** Sinonim -> kata kanonik yang muncul pada nama/deskripsi dokumen. */
const SINONIM: Record<string, string> = {
  izin: 'cuti',
  cuti: 'cuti',
  tahunan: 'cuti',
  libur: 'cuti',
  melahirkan: 'kia',
  hamil: 'kia',
  lembur: 'lembur',
  overtime: 'lembur',
  phk: 'phk',
  pesangon: 'phk',
  pemutusan: 'phk',
  berhenti: 'phk',
  gaji: 'upah',
  upah: 'upah',
  slip: 'upah',
  tunjangan: 'upah',
  kontrak: 'pkwt',
  pkwt: 'pkwt',
  tetap: 'pkwtt',
  pkwtt: 'pkwtt',
  outsourcing: 'alih',
  alih: 'alih',
  daya: 'alih',
  bpjs: 'jamsos',
  jamsos: 'jamsos',
  jaminan: 'jamsos',
  sosial: 'jamsos',
  asing: 'tka',
  tka: 'tka',
  rptka: 'tka',
  peraturan: 'pp',
  perusahaan: 'pp',
};

function normal(teks: string): string[] {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Token pencarian: buang kata umum, ubah sinonim ke bentuk kanonik. */
export function kataKunci(teks: string): string[] {
  return normal(teks)
    .filter((kata) => !STOPWORD.has(kata))
    .map((kata) => SINONIM[kata] ?? kata);
}

export type HasilCari = {
  preset: DokumenPreset;
  skor: number;
  cocok: string[];
};

/**
 * Kembalikan dokumen yang paling relevan untuk `teks`.
 * Hasil kosong berarti tidak ada kata yang dikenali.
 */
export function cariDokumen(
  teks: string,
  daftar: DokumenPreset[],
  maks = 3,
): HasilCari[] {
  const kunci = kataKunci(teks);
  if (kunci.length === 0) return [];

  return daftar
    .map((preset) => {
      const nama = normal(preset.nama);
      const deskripsi = normal(preset.deskripsi ?? '');
      let skor = 0;
      const cocok = new Set<string>();

      for (const kata of kunci) {
        const diNama = nama.some((kataNama) => kataNama.startsWith(kata));
        const diDeskripsi = deskripsi.some((kataDesc) => kataDesc.startsWith(kata));
        if (diNama) {
          skor += 3;
          cocok.add(kata);
        } else if (diDeskripsi) {
          skor += 1;
          cocok.add(kata);
        }
      }

      return { preset, skor, cocok: [...cocok] };
    })
    .filter((hasil) => hasil.skor > 0)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, maks);
}
