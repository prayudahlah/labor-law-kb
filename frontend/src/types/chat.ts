import type { Mode } from './app';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  /** Respons utuh dari backend — dipakai untuk merender kartu hasil (M3). */
  payload?: import('./api').ChatResponse;
  /** Respons `POST /dokumen` untuk entri riwayat mode dokumen. */
  draf?: import('./api').DokumenResponse;
};

export type Recent = {
  /** = sesi di backend */
  id: string;
  mode: Mode;
  /** Judul otomatis dari pesan pertama (40 karakter). */
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  /** Entri mode dokumen: jenis dokumen yang dikerjakan. */
  dokumenId?: string;
  /** Entri mode dokumen: isian yang dipakai draf (nama perusahaan, dsb.). */
  fakta?: Record<string, string>;
  /** Entri mode dokumen: pasal yang ditandai saat entri disimpan. */
  pasal?: string[];
  /** Entri mode dokumen: teks draf yang ditulis user (editor). */
  drafTeks?: string;
  /** Entri mode dokumen: teks ringkasan yang disimpan. */
  ringkasan?: string;
};
