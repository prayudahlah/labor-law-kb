/** Teks & label yang dipakai di banyak tempat. Ubah sekali di sini. */

export const APP_NAME = 'LawKB';
export const APP_TAGLINE = 'Expert System Hukum Ketenagakerjaan';

/** Judul halaman sidebar di bawah logo. */
export const SIDEBAR_TAGLINE = 'Hukum Ketenagakerjaan';

export const GREETING_LEAD = 'Hello, how can I';
export const GREETING_ACCENT = 'help you?';

export const PLACEHOLDER_TEXT = 'Ketik pertanyaan atau data Anda…';

/** Mode yang tersedia di chips composer. */
export const MODE_LABEL = {
  chat: 'Chat biasa',
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
  jenisHari: 'Jenis hari lembur',
  peristiwa: 'Peristiwa cuti',
  perempuan: 'Pekerja perempuan',
  sedangCutiMelahirkan: 'Sedang cuti melahirkan',
  cutiMelahirkanBulan: 'Lama cuti melahirkan (bulan)',
};

/** Label nilai `peristiwa` cuti yang dikirim backend. */
export const PERISTIWA_LABEL: Record<string, string> = {
  UpahCutiMenikah: 'Menikah',
  UpahCutiKeluarga2Hari: 'Keluarga/2 hari',
  UpahCutiKematianSerumah: 'Anggota serumah meninggal',
  CutiHaid: 'Haid',
  CutiKeguguran: 'Keguguran',
};

/** Label badge `hak` hasil inferensi. */
export const HAK_LABEL: Record<string, string> = {
  CutiTahunan: 'Cuti tahunan',
  CutiHaid: 'Cuti haid',
  CutiKhusus: 'Cuti khusus',
  CutiMelahirkan: 'Cuti melahirkan',
  CutiKeguguran: 'Cuti keguguran',
  CutiPendampinganSuami: 'Pendampingan suami',
  KompensasiPKWT: 'Kompensasi PKWT',
  JaminanSosial: 'Jaminan sosial',
  UpahLembur: 'Upah lembur',
  UangPisah: 'Uang pisah',
};

export type RincianMeta = {
  label: string;
  satuan?: string;
  rupiah?: boolean;
  persen?: boolean;
};

/** Label dan satuan untuk kunci `rincian` dari backend. */
export const RINCIAN_META: Record<string, RincianMeta> = {
  cuti_tahunan_hari: { label: 'Cuti tahunan', satuan: 'hari' },
  cuti_khusus_hari: { label: 'Cuti khusus', satuan: 'hari' },
  hari_dibayar: { label: 'Hari dibayar', satuan: 'hari' },
  cuti_haid_hari: { label: 'Cuti haid', satuan: 'hari' },
  cuti_keguguran_bulan: { label: 'Cuti keguguran', satuan: 'bulan' },
  peristiwa: { label: 'Peristiwa cuti' },
  masa_kerja: { label: 'Masa kerja', satuan: 'bulan' },
  cuti_bulan: { label: 'Cuti', satuan: 'bulan' },
  upah_bulan: { label: 'Upah dibayar', satuan: 'bulan' },
  pesangon_bulan: { label: 'Pesangon', satuan: 'bulan' },
  upmk_bulan: { label: 'UPMK', satuan: 'bulan' },
  total_bulan: { label: 'Total', satuan: 'bulan' },
  kompensasi_bulan: { label: 'Kompensasi', satuan: 'bulan' },
  upah_sejam: { label: 'Upah sejam', rupiah: true },
  jam: { label: 'Jam lembur', satuan: 'jam' },
  persen_pekerja: { label: 'Persen pekerja', persen: true },
  persen_pengusaha: { label: 'Persen pengusaha', persen: true },
  iuran_pekerja: { label: 'Iuran pekerja', rupiah: true },
  iuran_pengusaha: { label: 'Iuran pengusaha', rupiah: true },
};
