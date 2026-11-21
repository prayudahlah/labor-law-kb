import { FIELD_LABEL } from '../config/constants';
import { ApiError } from '../services/client';
import { labelManusia } from './text';

type ButirGalat = { loc?: unknown; msg?: unknown };

function labelLokasi(loc: unknown): string {
  if (!Array.isArray(loc)) return '';
  for (let i = loc.length - 1; i >= 0; i -= 1) {
    const bagian = loc[i];
    if (typeof bagian === 'string') {
      return FIELD_LABEL[bagian] ?? labelManusia(bagian);
    }
  }
  return '';
}

/**
 * Ubah error API menjadi pesan yang bisa dibaca pengguna.
 * Detail validasi 422 berbentuk list `{ loc, msg }`; detail mode SWRL
 * berbentuk string. Keduanya ditampilkan, bukan hanya "HTTP 422".
 */
export function pesanGalat(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.';
  }

  const detail = err.detail;
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const baris = (detail as ButirGalat[])
      .map((butir) => {
        const label = labelLokasi(butir.loc);
        const pesan = typeof butir.msg === 'string' ? butir.msg : 'nilai tidak valid';
        return label ? `${label}: ${pesan}` : pesan;
      })
      .filter((teks) => teks.length > 0);
    if (baris.length > 0) return baris.join('\n');
  }

  return err.message;
}
