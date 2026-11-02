import type { ChatMessage, ChatRole, Recent } from '../types/chat';
import { startOfDay } from '../lib/time';

/**
 * Data contoh — hanya dipakai SAAT PERTAMA KALI penyimpanan masih kosong.
 * Setelah ada isi (baik dari user maupun nanti dari endpoint backend),
 * seed ini tidak dibaca lagi.
 */

const JAM = 3_600_000;
const HARI = 24 * JAM;

function pesan(sesi: string, riwayat: readonly [ChatRole, string][], mulai: number): ChatMessage[] {
  return riwayat.map(([role, text], index) => ({
    id: `${sesi}-${index + 1}`,
    role,
    text,
    createdAt: mulai + index * 45_000,
  }));
}

export function buatSeed(now: number = Date.now()): Recent[] {
  const hariIni = startOfDay(now);
  /** Jam ke-n sejak tengah malam hari ini, dijamin tidak melewati `now`. */
  const hariIniJam = (jam: number) => Math.min(hariIni + jam * JAM, now - 60_000);
  /** Jam ke-n pada hari ke-n yang lalu. */
  const lalu = (hari: number, jam: number) => hariIni - hari * HARI + jam * JAM;

  const daftar: Array<Omit<Recent, 'messages'> & { messages: ChatMessage[] }> = [
    {
      id: 's-1001',
      mode: 'chat',
      title: 'Berapa pesangon kalau kerja 5 tahun?',
      updatedAt: hariIniJam(10),
      messages: pesan(
        's-1001',
        [
          ['user', 'Saya kerja 5 tahun, gaji 5 juta, di-PHK karena efisiensi. Berapa pesangon saya?'],
          [
            'assistant',
            'Hak yang terpenuhi: Pesangon, UPMK, UPH. Perkiraan nominal Rp42.500.000. Dasar: PP 35/2021 Pasal 43 ayat (1).',
          ],
          ['user', 'Kalau gaji saya naik jadi 6 juta?'],
          [
            'assistant',
            'Perkiraan nominal Rp51.000.000 dengan komponen yang sama.',
          ],
        ],
        hariIniJam(10),
      ),
    },
    {
      id: 's-1002',
      mode: 'dokumen',
      title: 'Syarat wajib peraturan perusahaan',
      updatedAt: hariIniJam(4),
      messages: pesan(
        's-1002',
        [
          ['user', 'Apa saja yang wajib memuat peraturan perusahaan?'],
          ['assistant', 'Menyiapkan daftar ketentuan… (menunggu endpoint backend).'],
          ['user', 'Bagian cuti dan hari libur masuk juga?'],
        ],
        hariIniJam(4),
      ),
    },
    {
      id: 's-1003',
      mode: 'chat',
      title: 'Hitung lembur 4 jam, gaji 5 juta',
      updatedAt: lalu(1, 14),
      messages: pesan(
        's-1003',
        [
          ['user', 'Lembur 4 jam hari kerja, gaji bulanan 5 juta, berapa upah lemburnya?'],
          [
            'assistant',
            'Upah sejam Rp28.902 (1/173 x upah bulanan), total lembur Rp115.607. Dasar: PP 35/2021 Pasal 32.',
          ],
        ],
        lalu(1, 14),
      ),
    },
    {
      id: 's-1004',
      mode: 'chat',
      title: 'Cuti melahirkan berapa lama?',
      updatedAt: lalu(1, 9),
      messages: pesan(
        's-1004',
        [
          ['user', 'CutI melahirkan berapa bulan dan upahnya dibayar penuh?'],
          [
            'assistant',
            'Cuti melahirkan 3 bulan dengan upah tetap dibayar. Dasar: UU 13/2003 Pasal 92.',
          ],
        ],
        lalu(1, 9),
      ),
    },
    {
      id: 's-1005',
      mode: 'dokumen',
      title: 'Ketentuan alih daya (outsourcing)',
      updatedAt: lalu(3, 11),
      messages: pesan(
        's-1005',
        [
          ['user', 'Ketentuan apa saja yang harus masuk ke perjanjian alih daya?'],
          ['assistant', 'Menyiapkan daftar ketentuan… (menunggu endpoint backend).'],
        ],
        lalu(3, 11),
      ),
    },
    {
      id: 's-1006',
      mode: 'chat',
      title: 'Upah minimum Jakarta terbaru',
      updatedAt: lalu(5, 16),
      messages: pesan(
        's-1006',
        [
          ['user', 'Berapa upah minimum di Jakarta sekarang?'],
          [
            'assistant',
            'Daftar ketentuan topik Upah: besaran dan cara pembayaran upah diatur dalam PP 36/2021.',
          ],
        ],
        lalu(5, 16),
      ),
    },
    {
      id: 's-1007',
      mode: 'chat',
      title: 'Jam kerja dan waktu istirahat',
      updatedAt: lalu(12, 9),
      messages: pesan(
        's-1007',
        [
          ['user', 'Berapa jam kerja maksimal dalam sehari?'],
          [
            'assistant',
            '7 jam per hari atau 40 jam per minggu. Dasar: UU 13/2003 Pasal 77.',
          ],
        ],
        lalu(12, 9),
      ),
    },
  ];

  return daftar;
}
