/** Teks & label yang dipakai di banyak tempat. Ubah sekali di sini. */

export const APP_NAME = 'LawKB';
export const APP_TAGLINE = 'Expert System Hukum Ketenagakerjaan';

/** Judul halaman sidebar di bawah logo. */
export const SIDEBAR_TAGLINE = 'Hukum Ketenagakerjaan';

export const GREETING_LEAD = 'Hello, how can I';
export const GREETING_ACCENT = 'help you?';

/** Subjudul di layar awal mode chat. */
export const GREETING_SUB =
  'Mulai dengan Tanya Jawab untuk berkonsultasi, atau pilih Asistensi Dokumen untuk menyusun draf beserta pasal rujukannya.';

export const PLACEHOLDER_TEXT = 'Ketik pertanyaan atau data Anda…';

/** Mode yang tersedia di chips composer. */
export const MODE_LABEL = {
  chat: 'Tanya Jawab',
  dokumen: 'Asistensi Dokumen',
} as const;

/**
 * Nama field form yang diminta backend pada mode klarifikasi,
 * diterjemahkan ke bahasa manusia (sumber: backend/app/forms.py).
 */
export const FIELD_LABEL: Record<string, string> = {
  masaKerjaBulan: 'Masa kerja (bulan)',
  upahBulanan: 'Upah bulanan',
  alasanPHK: 'Alasan PHK',
  bentukHubunganKerja: 'Bentuk hubungan kerja',
  jamLembur: 'Jam lembur',
  padaHariKerja: 'Pada hari kerja',
  peristiwa: 'Peristiwa cuti',
  perempuan: 'Pekerja perempuan',
  sedangCutiMelahirkan: 'Sedang cuti melahirkan',
  cutiMelahirkanBulan: 'Lama cuti melahirkan (bulan)',
};
