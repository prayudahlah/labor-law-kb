/** Pembantu penulisan teks untuk UI. */

import { HAK_LABEL, PERISTIWA_LABEL, RINCIAN_META } from '../config/constants';

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

/** "28.901,73" / "1,5" */
export function formatAngka(nilai: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(nilai);
}

/** Label manusia untuk kunci `rincian` (fallback ke labelManusia). */
export function labelRincian(kunci: string): string {
  return RINCIAN_META[kunci]?.label ?? labelManusia(kunci);
}

/** Nilai `rincian` dengan satuan/format yang sesuai. */
export function formatNilaiRincian(kunci: string, nilai: number | string): string {
  if (kunci === 'peristiwa') {
    const teks = String(nilai);
    return PERISTIWA_LABEL[teks] ?? labelManusia(teks);
  }
  if (typeof nilai !== 'number') return nilai;

  const meta = RINCIAN_META[kunci];
  if (meta?.rupiah) return formatRupiah(nilai);
  if (meta?.persen) return `${formatAngka(nilai)}%`;
  return meta?.satuan ? `${formatAngka(nilai)} ${meta.satuan}` : formatAngka(nilai);
}

/** Label badge `hak` (fallback ke kode aslinya). */
export function labelHak(hak: string): string {
  return HAK_LABEL[hak] ?? hak;
}

/** Potong teks panjang untuk judul recents. */
export function potong(value: string, maks = 40): string {
  const bersih = value.replace(/\s+/g, ' ').trim();
  return bersih.length <= maks ? bersih : `${bersih.slice(0, maks - 1)}…`;
}
