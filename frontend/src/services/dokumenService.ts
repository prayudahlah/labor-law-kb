import type {
  ButirKetentuan,
  DokumenPreset,
  DokumenRequest,
  DokumenResponse,
  InferResponse,
  KetentuanResponse,
} from '../types/api';
import { getJSON, postJSON } from './client';

/** GET /ketentuan/dokumen — 10 jenis dokumen beserta nama & deskripsinya. */
export function daftarDokumen(): Promise<DokumenPreset[]> {
  return getJSON<DokumenPreset[]>('/ketentuan/dokumen');
}

/** POST /ketentuan dengan `dokumen` — daftar pasal yang perlu dipertimbangkan. */
export async function ketentuanDokumen(id: string): Promise<ButirKetentuan[]> {
  const hasil = await postJSON<KetentuanResponse>('/ketentuan', { dokumen: id });
  return hasil.butir ?? [];
}

/** POST /dokumen — susun draf. Hanya jenis dokumen yang punya template. */
export function susunDokumen(request: DokumenRequest): Promise<DokumenResponse> {
  return postJSON<DokumenResponse>('/dokumen', request);
}

/** POST /infer — hitung hak (SWRL) untuk fakta PHK. */
export function hitungPhk(fakta: {
  masaKerjaBulan: number;
  upahBulanan: number;
  alasanPHK: string;
}): Promise<InferResponse> {
  return postJSON<InferResponse>('/infer', { topik: 'PHK', fakta });
}
