/** Pembantu penulisan teks untuk UI. */

const toSpasi = (value: string): string =>
  value.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');

const kapitalAwal = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/** "KetentuanMakanLembur" / "pesangon_bulan" -> "Ketentuan makan lembur" */
export function labelManusia(value: string): string {
  return kapitalAwal(toSpasi(value));
}

/** "Rp42.500.000" */
export function formatRupiah(nilai: number): string {
  return `Rp${Math.round(nilai).toLocaleString('id-ID')}`;
}

/** Potong teks panjang untuk judul recents. */
export function potong(value: string, maks = 40): string {
  const bersih = value.replace(/\s+/g, ' ').trim();
  return bersih.length <= maks ? bersih : `${bersih.slice(0, maks - 1)}…`;
}

/** Kalimat penutup "…bukan nasihat hukum." di akhir jawaban. */
const POLA_CATATAN = /((?:daftar ketentuan|draf)?,?\s*bukan nasihat hukum)\.?\s*$/i;

/**
 * Pisahkan catatan penutup dari isi jawaban.
 * Dipakai agar catatan tampil di luar bubble, bukan di dalamnya.
 */
export function pisahCatatan(teks: string): { isi: string; catatan: string | null } {
  const bersih = teks.trim();
  const cocok = POLA_CATATAN.exec(bersih);
  if (!cocok) return { isi: bersih, catatan: null };

  const isi = bersih.slice(0, cocok.index).trim();
  const mentah = cocok[1].trim().replace(/^,\s*/, '');
  const catatan = mentah.charAt(0).toUpperCase() + mentah.slice(1) + '.';
  return { isi, catatan };
}
