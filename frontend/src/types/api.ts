/** Kontrak API dari backend (mirror `backend/app/schemas.py`). */

export interface ButirKetentuan {
  topik: string;
  jenis: string;
  pasal: string;
  norma: string;
  /** Halaman resmi peraturan (JDIH/BPK). */
  tautan?: string | null;
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

/** GET /ketentuan/dokumen — jenis dokumen yang bisa disusun. */
export interface DokumenPreset {
  id: string;
  nama: string;
  deskripsi?: string | null;
}

/** Satu klausul dalam draf dokumen (POST /dokumen). */
export interface DokumenButir {
  bagian: string;
  urutan: number;
  topik: string[];
  wajib: boolean;
  template: string;
  butir: ButirKetentuan[];
}

/** Pilihan dropdown pada field bertipe `select`. */
export interface DokumenPilihan {
  nilai: string;
  label: string;
}

/** Definisi satu field formulir dari template dokumen. */
export interface DokumenField {
  key: string;
  label: string;
  tipe: 'text' | 'textarea' | 'number' | 'date' | 'select' | string;
  wajib: boolean;
  pilihan: DokumenPilihan[];
  placeholder?: string;
  bantuan?: string;
}

/** Satu baris lampiran dasar hukum (halaman 2). */
export interface DokumenLampiran {
  pasal: string;
  judul: string;
  tautan?: string | null;
}

/** Respons POST /dokumen. */
export interface DokumenResponse {
  mode: string;
  dokumen: string;
  judul: string;
  wajib: DokumenButir[];
  opsional: DokumenButir[];
  template: string;
  pasal: string[];
  catatan?: string;
  /** Template surat baru: definisi form & lampiran. */
  fields?: DokumenField[];
  lampiran?: DokumenLampiran[];
}

/** Request POST /dokumen. */
export interface DokumenRequest {
  sesi: string;
  dokumen: string;
  topik?: string[];
  fakta?: Record<string, unknown>;
}

/** Respons POST /infer. */
export interface InferResponse {
  mode: string;
  hak: string[];
  rincian: Record<string, number | string>;
  nominal: number | null;
  pasal: string[];
  narasi?: string | null;
  catatan?: string;
}

/** Respons POST /ketentuan. */
export interface KetentuanResponse {
  mode: string;
  scope?: Record<string, unknown> | null;
  butir: ButirKetentuan[];
  narasi?: string | null;
  catatan?: string;
}
