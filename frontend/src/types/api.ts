/** Kontrak API dari backend (mirror `backend/app/schemas.py`). */

export interface ButirKetentuan {
  topik: string;
  jenis: string;
  pasal: string;
  norma: string;
}

export interface SlotField {
  nama: string;
  nilai: unknown;
  wajib: boolean;
  terisi: boolean;
}

export interface Slot {
  topik: string;
  fields: SlotField[];
  kurang: string[];
}

/**
 * Respons POST /chat. Field bersifat opsional karena isinya bergantung pada
 * `mode` (klarifikasi / inferensi / retrieval).
 */
export interface ChatResponse {
  mode: string;
  pesan?: string | null;
  pertanyaan?: string | null;
  pilihan?: string[] | null;
  kurang?: string[] | null;
  scope?: Record<string, unknown> | null;
  hak?: string[] | null;
  rincian?: Record<string, number | string> | null;
  nominal?: number | null;
  pasal?: string[] | null;
  butir?: ButirKetentuan[] | null;
  narasi?: string | null;
  slot?: Slot | null;
  state?: Record<string, unknown> | null;
  catatan?: string;
}
