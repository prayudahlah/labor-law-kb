import type { DokumenField, DokumenLampiran } from '../types/api';

/**
 * SEMENTARA — mock Surat PHK sampai `POST /dokumen` backend siap.
 *
 * Semua teks surat dan rujukan hukum di file ini hanya placeholder kontrak.
 * Setelah backend mengirim `fields` + `template` + `lampiran`, file ini boleh
 * dihapus dan form memakai data dari respons backend.
 */

export type VarianPhk = 'pemberitahuan' | 'keputusan';

export const LABEL_VARIAN: Record<VarianPhk, string> = {
  pemberitahuan: 'Pemberitahuan',
  keputusan: 'Keputusan',
};

/** Rujukan hukum; nilainya diambil dari KB saat backend siap. */
const REGULASI = 'Peraturan Pemerintah Nomor 35 Tahun 2021';
const TAUTAN_PP35 =
  'https://peraturan.bpk.go.id/Details/161904/pp-no-35-tahun-2021';

const RUJUKAN = {
  pasal_uph: 'Pasal 40 ayat (4)',
  pasal_penolakan: 'Pasal 39 ayat (1)',
  pasal_pelaporan: 'Pasal 38',
  pasal_bipartit: 'Pasal 39 ayat (2)',
  pasal_pemberitahuan: 'Pasal 37 ayat (3)',
  pasal_hak: 'Pasal 40 ayat (1)',
};

type Alasan = { nilai: string; label: string; pasal: string };

/**
 * Alasan PHK yang suratnya diterbitkan perusahaan (bukan pengunduran diri,
 * meninggal, atau permohonan pekerja).
 */
const ALASAN: Alasan[] = [
  { nilai: 'EfisiensiRugi', label: 'efisiensi karena perusahaan mengalami kerugian', pasal: 'Pasal 43 ayat (1)' },
  { nilai: 'EfisiensiMencegahRugi', label: 'efisiensi untuk mencegah kerugian', pasal: 'Pasal 43 ayat (2)' },
  { nilai: 'TutupKarenaRugi', label: 'perusahaan tutup karena mengalami kerugian', pasal: 'Pasal 44 ayat (1)' },
  { nilai: 'TutupBukanKarenaRugi', label: 'perusahaan tutup bukan karena kerugian', pasal: 'Pasal 44 ayat (2)' },
  { nilai: 'ForceMajeureTutup', label: 'perusahaan tutup karena keadaan memaksa', pasal: 'Pasal 45 ayat (1)' },
  { nilai: 'ForceMajeureTidakTutup', label: 'keadaan memaksa tanpa penutupan perusahaan', pasal: 'Pasal 45 ayat (2)' },
  { nilai: 'PKPUKarenaRugi', label: 'penundaan kewajiban pembayaran utang karena kerugian', pasal: 'Pasal 46 ayat (1)' },
  { nilai: 'PKPUKarenaTidakRugi', label: 'penundaan kewajiban pembayaran utang bukan karena kerugian', pasal: 'Pasal 46 ayat (2)' },
  { nilai: 'Pailit', label: 'perusahaan dinyatakan pailit', pasal: 'Pasal 47' },
  { nilai: 'Merger', label: 'penggabungan, peleburan, atau pemisahan perusahaan', pasal: 'Pasal 41' },
  { nilai: 'Pengambilalihan', label: 'pengambilalihan perusahaan', pasal: 'Pasal 42 ayat (1)' },
  { nilai: 'PengambilalihanUbahSyarat', label: 'pengambilalihan yang mengubah syarat kerja', pasal: 'Pasal 42 ayat (2)' },
  { nilai: 'PelanggaranSP', label: 'pelanggaran ketentuan kerja setelah tiga surat peringatan', pasal: 'Pasal 52 ayat (1)' },
  { nilai: 'PelanggaranMendesak', label: 'pelanggaran bersifat mendesak', pasal: 'Pasal 52 ayat (2)' },
  { nilai: 'Mangkir', label: 'mangkir lima hari kerja atau lebih', pasal: 'Pasal 51' },
  { nilai: 'DitahanMerugikan', label: 'ditahan karena dugaan tindak pidana dan merugikan perusahaan', pasal: 'Pasal 54 ayat (1)' },
  { nilai: 'DitahanTidakMerugikan', label: 'ditahan karena dugaan tindak pidana tanpa kerugian perusahaan', pasal: 'Pasal 54 ayat (2)' },
  { nilai: 'SakitBerkepanjangan', label: 'sakit berkepanjangan atau cacat akibat kecelakaan kerja', pasal: 'Pasal 55 ayat (1)' },
  { nilai: 'Pensiun', label: 'memasuki usia pensiun', pasal: 'Pasal 56' },
];

const FIELD_UMUM: DokumenField[] = [
  { key: 'nama_perusahaan', label: 'Nama perusahaan', tipe: 'text', wajib: true, pilihan: [], placeholder: 'PT Maju Jaya' },
  { key: 'alamat_perusahaan', label: 'Alamat perusahaan', tipe: 'textarea', wajib: true, pilihan: [], placeholder: 'Jl. Slamet Riyadi 1, Surakarta' },
  { key: 'kontak', label: 'Kontak perusahaan', tipe: 'text', wajib: false, pilihan: [], placeholder: '0271-123456' },
  { key: 'nomor_surat', label: 'Nomor surat', tipe: 'text', wajib: true, pilihan: [], placeholder: '12/PHK/XI/2026' },
  { key: 'tempat', label: 'Tempat', tipe: 'text', wajib: true, pilihan: [], placeholder: 'Surakarta' },
  { key: 'tanggal_surat', label: 'Tanggal surat', tipe: 'date', wajib: true, pilihan: [] },
  { key: 'nama_pekerja', label: 'Nama pekerja', tipe: 'text', wajib: true, pilihan: [], placeholder: 'Budi Santoso' },
  { key: 'jabatan_pekerja', label: 'Jabatan pekerja', tipe: 'text', wajib: true, pilihan: [], placeholder: 'Operator Produksi' },
  { key: 'alamat_pekerja', label: 'Alamat pekerja', tipe: 'textarea', wajib: true, pilihan: [], placeholder: 'Jl. Melati 2, Surakarta' },
  { key: 'masa_kerja_bulan', label: 'Masa kerja (bulan)', tipe: 'number', wajib: true, pilihan: [], placeholder: '120' },
  { key: 'upah_bulanan', label: 'Upah sebulan (Rp)', tipe: 'number', wajib: true, pilihan: [], placeholder: '5000000' },
  { key: 'alasan_phk', label: 'Alasan PHK', tipe: 'select', wajib: true, pilihan: ALASAN.map(({ nilai, label }) => ({ nilai, label })) },
  { key: 'tanggal_efektif', label: 'Tanggal efektif PHK', tipe: 'date', wajib: true, pilihan: [] },
  { key: 'nama_penandatangan', label: 'Nama penandatangan', tipe: 'text', wajib: true, pilihan: [], placeholder: 'Siti Aminah' },
  { key: 'jabatan_penandatangan', label: 'Jabatan penandatangan', tipe: 'text', wajib: true, pilihan: [], placeholder: 'HRD Manager' },
];

const FIELD_KEPUTUSAN: DokumenField[] = [
  { key: 'tanggal_pemberitahuan', label: 'Tanggal surat pemberitahuan', tipe: 'date', wajib: true, pilihan: [] },
  { key: 'nomor_pemberitahuan', label: 'Nomor surat pemberitahuan', tipe: 'text', wajib: false, pilihan: [], placeholder: '12/PHK/XI/2026' },
  {
    key: 'status_penolakan',
    label: 'Dasar penyelesaian',
    tipe: 'select',
    wajib: true,
    pilihan: [
      { nilai: 'tidak_ada_penolakan', label: 'Tidak ada penolakan dari pekerja' },
      { nilai: 'bipartit_selesai', label: 'Kesepakatan bipartit' },
      { nilai: 'putusan_phi', label: 'Putusan Pengadilan Hubungan Industrial' },
    ],
  },
  { key: 'nomor_kesepakatan', label: 'Nomor kesepakatan bipartit', tipe: 'text', wajib: false, pilihan: [] },
  { key: 'tanggal_kesepakatan', label: 'Tanggal kesepakatan bipartit', tipe: 'date', wajib: false, pilihan: [] },
  { key: 'nomor_putusan', label: 'Nomor putusan PHI', tipe: 'text', wajib: false, pilihan: [] },
  { key: 'tanggal_putusan', label: 'Tanggal putusan PHI', tipe: 'date', wajib: false, pilihan: [] },
];

export function fieldsPhk(varian: VarianPhk): DokumenField[] {
  return varian === 'keputusan' ? [...FIELD_UMUM, ...FIELD_KEPUTUSAN] : FIELD_UMUM;
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function tanggalPanjang(iso: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!cocok) return iso;
  return `${Number(cocok[3])} ${BULAN[Number(cocok[2]) - 1]} ${cocok[1]}`;
}

function angkaRibuan(nilai: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(nilai);
}

function angkaDesimal(nilai: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(nilai);
}

function masaKerjaTeks(bulan: number): string {
  if (bulan < 12) return `${bulan} bulan`;
  const tahun = Math.floor(bulan / 12);
  const sisa = bulan % 12;
  const dasar = sisa === 0 ? `${tahun} tahun` : `${tahun} tahun ${sisa} bulan`;
  return `${dasar} (${bulan} bulan)`;
}

export type HasilHitung = {
  bulanUp: number;
  bulanUpmk: number;
  totalBulan: number;
  nominalUp: number;
  nominalUpmk: number;
  nominalTotal: number;
};

/** Hitung komponen rupiah dari hasil SWRL + upah. */
export function hitungKomponen(
  upah: number,
  bulanUp: number,
  bulanUpmk: number,
  totalBulan: number,
): HasilHitung {
  const nominalUp = Math.round(bulanUp * upah);
  const nominalUpmk = Math.round(bulanUpmk * upah);
  return {
    bulanUp,
    bulanUpmk,
    totalBulan,
    nominalUp,
    nominalUpmk,
    nominalTotal: nominalUp + nominalUpmk,
  };
}

function alasanDipilih(nilai: string): Alasan | undefined {
  return ALASAN.find((item) => item.nilai === nilai);
}

function isi(teks: string, peta: Record<string, string>): string {
  return teks.replace(/\{([a-zA-Z0-9_]+)\}/g, (_utuh, kunci: string) => peta[kunci] ?? '');
}

function uraianFinal(peta: Record<string, string>, status: string): string {
  if (status === 'bipartit_selesai') {
    return `Pemutusan Hubungan Kerja diselesaikan berdasarkan kesepakatan para pihak dalam perundingan bipartit Nomor ${peta.nomor_kesepakatan} tanggal ${peta.tanggal_kesepakatan}, sesuai ${peta.pasal_bipartit} ${peta.regulasi}.`;
  }
  if (status === 'putusan_phi') {
    return `Pemutusan Hubungan Kerja dilaksanakan berdasarkan putusan Pengadilan Hubungan Industrial Nomor ${peta.nomor_putusan} tanggal ${peta.tanggal_putusan}.`;
  }
  return `Pekerja tidak menyampaikan penolakan dalam jangka waktu 7 (tujuh) hari kerja sebagaimana diatur dalam ${peta.pasal_penolakan} ${peta.regulasi}. Selanjutnya perusahaan melaporkan Pemutusan Hubungan Kerja kepada instansi ketenagakerjaan sesuai ${peta.pasal_pelaporan} ${peta.regulasi}.`;
}

/** Pesan validasi; kosong berarti siap disusun. */
export function validasiSurat(varian: VarianPhk, fakta: Record<string, string>): string[] {
  const kurang = fieldsPhk(varian)
    .filter((field) => field.wajib && !(fakta[field.key] ?? '').trim())
    .map((field) => field.label);

  if (varian === 'keputusan') {
    const status = fakta.status_penolakan ?? '';
    if (status === 'bipartit_selesai') {
      if (!(fakta.nomor_kesepakatan ?? '').trim()) kurang.push('Nomor kesepakatan bipartit');
      if (!(fakta.tanggal_kesepakatan ?? '').trim()) kurang.push('Tanggal kesepakatan bipartit');
    }
    if (status === 'putusan_phi') {
      if (!(fakta.nomor_putusan ?? '').trim()) kurang.push('Nomor putusan PHI');
      if (!(fakta.tanggal_putusan ?? '').trim()) kurang.push('Tanggal putusan PHI');
    }
  }

  return kurang;
}

export type HasilSurat = {
  template: string;
  lampiran: DokumenLampiran[];
  pasal: string[];
};

export function renderSuratPhk(
  varian: VarianPhk,
  fakta: Record<string, string>,
  hitung: HasilHitung,
): HasilSurat {
  const alasan = alasanDipilih(fakta.alasan_phk ?? '');
  const status = fakta.status_penolakan ?? 'tidak_ada_penolakan';
  const nomorPemberitahuan = (fakta.nomor_pemberitahuan ?? '').trim();
  const tanggalPemberitahuan = fakta.tanggal_pemberitahuan
    ? tanggalPanjang(fakta.tanggal_pemberitahuan)
    : '';

  const peta: Record<string, string> = {
    nama_perusahaan: fakta.nama_perusahaan ?? '',
    alamat_perusahaan: fakta.alamat_perusahaan ?? '',
    kontak: fakta.kontak ?? '',
    nomor_surat: fakta.nomor_surat ?? '',
    tempat: fakta.tempat ?? '',
    tanggal_surat: tanggalPanjang(fakta.tanggal_surat ?? ''),
    nama_pekerja: fakta.nama_pekerja ?? '',
    jabatan_pekerja: fakta.jabatan_pekerja ?? '',
    alamat_pekerja: fakta.alamat_pekerja ?? '',
    masa_kerja: masaKerjaTeks(Number(fakta.masa_kerja_bulan ?? 0)),
    upah_bulanan: angkaRibuan(Number(fakta.upah_bulanan ?? 0)),
    alasan_phk: alasan?.label ?? '',
    pasal_rujukan: alasan?.pasal ?? '',
    regulasi: REGULASI,
    tanggal_efektif: tanggalPanjang(fakta.tanggal_efektif ?? ''),
    nama_penandatangan: fakta.nama_penandatangan ?? '',
    jabatan_penandatangan: fakta.jabatan_penandatangan ?? '',
    tanggal_pemberitahuan: tanggalPemberitahuan,
    nomor_pemberitahuan: nomorPemberitahuan,
    nomor_kesepakatan: fakta.nomor_kesepakatan ?? '',
    tanggal_kesepakatan: tanggalPanjang(fakta.tanggal_kesepakatan ?? ''),
    nomor_putusan: fakta.nomor_putusan ?? '',
    tanggal_putusan: tanggalPanjang(fakta.tanggal_putusan ?? ''),
    surat_pemberitahuan: nomorPemberitahuan
      ? `surat pemberitahuan Nomor ${nomorPemberitahuan} tanggal ${tanggalPemberitahuan}`
      : `surat pemberitahuan tanggal ${tanggalPemberitahuan}`,
    bulan_up: angkaDesimal(hitung.bulanUp),
    bulan_upmk: angkaDesimal(hitung.bulanUpmk),
    total_bulan: angkaDesimal(hitung.totalBulan),
    nominal_up: angkaRibuan(hitung.nominalUp),
    nominal_upmk: angkaRibuan(hitung.nominalUpmk),
    nominal_total: angkaRibuan(hitung.nominalTotal),
    pasal_uph: RUJUKAN.pasal_uph,
    pasal_penolakan: RUJUKAN.pasal_penolakan,
    pasal_pelaporan: RUJUKAN.pasal_pelaporan,
    pasal_bipartit: RUJUKAN.pasal_bipartit,
    pasal_pemberitahuan: RUJUKAN.pasal_pemberitahuan,
    uraian_dasar_final: uraianFinal(
      {
        ...RUJUKAN,
        regulasi: REGULASI,
        nomor_kesepakatan: fakta.nomor_kesepakatan ?? '',
        tanggal_kesepakatan: tanggalPanjang(fakta.tanggal_kesepakatan ?? ''),
        nomor_putusan: fakta.nomor_putusan ?? '',
        tanggal_putusan: tanggalPanjang(fakta.tanggal_putusan ?? ''),
      } as Record<string, string>,
      status,
    ),
  };

  const lampiran: DokumenLampiran[] = [
    { pasal: RUJUKAN.pasal_pemberitahuan, judul: REGULASI, tautan: TAUTAN_PP35 },
    { pasal: RUJUKAN.pasal_hak, judul: REGULASI, tautan: TAUTAN_PP35 },
    { pasal: RUJUKAN.pasal_uph, judul: REGULASI, tautan: TAUTAN_PP35 },
  ];
  if (alasan) lampiran.push({ pasal: alasan.pasal, judul: REGULASI, tautan: TAUTAN_PP35 });
  if (varian === 'keputusan') {
    if (status === 'tidak_ada_penolakan') {
      lampiran.push({ pasal: RUJUKAN.pasal_pelaporan, judul: REGULASI, tautan: TAUTAN_PP35 });
    }
    if (status === 'bipartit_selesai') {
      lampiran.push({ pasal: RUJUKAN.pasal_bipartit, judul: REGULASI, tautan: TAUTAN_PP35 });
    }
  }

  return {
    template: isi(TEMPLATE[varian], {
      ...peta,
      LAMPIRAN: lampiran
        .map(
          (item, index) =>
            `${index + 1}. ${item.pasal} — ${item.judul}${item.tautan ? ` — ${item.tautan}` : ''}`,
        )
        .join('\n'),
    }).trim(),
    lampiran,
    pasal: [...new Set(lampiran.map((item) => item.pasal))],
  };
}

const TEMPLATE: Record<VarianPhk, string> = {
  pemberitahuan: `**{nama_perusahaan}**
{alamat_perusahaan}
{kontak}

---

**SURAT PEMBERITAHUAN PEMUTUSAN HUBUNGAN KERJA**
Nomor: {nomor_surat}

{tempat}, {tanggal_surat}

Kepada Yth.
**{nama_pekerja}**
{jabatan_pekerja}
{alamat_pekerja}

Dengan hormat,

Berdasarkan pertimbangan perusahaan dan ketentuan peraturan perundang-undangan di bidang ketenagakerjaan, melalui surat ini kami bermaksud memberitahukan rencana Pemutusan Hubungan Kerja (PHK) terhadap pekerja dengan identitas sebagai berikut:

- Nama: {nama_pekerja}
- Jabatan: {jabatan_pekerja}
- Alamat: {alamat_pekerja}
- Masa Kerja: {masa_kerja}
- Upah Bulanan: Rp{upah_bulanan}

Rencana PHK ini dilakukan dengan alasan **{alasan_phk}**, sebagaimana diatur dalam **{pasal_rujukan} {regulasi}**.

Sehubungan dengan rencana PHK tersebut, perusahaan akan memenuhi hak-hak pekerja dengan rincian sebagai berikut:

1. **Uang Pesangon:** sebesar {bulan_up} bulan upah, senilai Rp{nominal_up}.
2. **Uang Penghargaan Masa Kerja (UPMK):** sebesar {bulan_upmk} bulan upah, senilai Rp{nominal_upmk}.
3. **Uang Penggantian Hak (UPH):** diberikan sesuai ketentuan {pasal_uph} {regulasi}.

Dengan demikian, total uang pesangon dan UPMK yang menjadi hak pekerja adalah sebesar **{total_bulan} bulan upah atau Rp{nominal_total}**, belum termasuk UPH.

Rencana Pemutusan Hubungan Kerja tersebut akan berlaku efektif pada tanggal **{tanggal_efektif}**.

Apabila pekerja tidak menyetujui rencana PHK ini, pekerja dapat menyampaikan penolakan secara tertulis disertai alasan paling lama 7 (tujuh) hari kerja setelah menerima surat pemberitahuan ini, sesuai dengan ketentuan {pasal_penolakan} {regulasi}.

Demikian surat pemberitahuan ini kami sampaikan untuk diketahui dan ditindaklanjuti sebagaimana mestinya.

Hormat kami,

**{nama_perusahaan}**

[Tanda tangan dan stempel perusahaan]

**{nama_penandatangan}**
{jabatan_penandatangan}

---

## LAMPIRAN — DASAR HUKUM

{LAMPIRAN}`,
  keputusan: `**{nama_perusahaan}**
{alamat_perusahaan}
{kontak}

---

**SURAT KEPUTUSAN PEMUTUSAN HUBUNGAN KERJA**
Nomor: {nomor_surat}

{tempat}, {tanggal_surat}

**TENTANG**
**PEMUTUSAN HUBUNGAN KERJA**

Yang bertanda tangan di bawah ini:

- Nama: {nama_penandatangan}
- Jabatan: {jabatan_penandatangan}
- Perusahaan: {nama_perusahaan}

Dengan ini menyatakan telah mengambil keputusan Pemutusan Hubungan Kerja (PHK) terhadap pekerja berikut:

- Nama: {nama_pekerja}
- Jabatan: {jabatan_pekerja}
- Alamat: {alamat_pekerja}
- Masa Kerja: {masa_kerja}
- Upah Bulanan: Rp{upah_bulanan}

**A. DASAR PEMUTUSAN HUBUNGAN KERJA**

Pemutusan Hubungan Kerja dilakukan dengan alasan **{alasan_phk}**, sebagaimana diatur dalam **{pasal_rujukan} {regulasi}**.

Perusahaan telah menyampaikan {surat_pemberitahuan} kepada pekerja sesuai dengan ketentuan peraturan perundang-undangan.

Adapun proses penyelesaian PHK didasarkan pada kondisi berikut:

{uraian_dasar_final}

**B. HAK PEKERJA**

Sebagai akibat dari Pemutusan Hubungan Kerja, perusahaan berkewajiban memenuhi hak-hak pekerja dengan rincian sebagai berikut:

1. **Uang Pesangon:** sebesar {bulan_up} bulan upah, senilai Rp{nominal_up}.
2. **Uang Penghargaan Masa Kerja (UPMK):** sebesar {bulan_upmk} bulan upah, senilai Rp{nominal_upmk}.
3. **Uang Penggantian Hak (UPH):** diberikan sesuai ketentuan {pasal_uph} {regulasi}.

Dengan demikian, total uang pesangon dan UPMK yang menjadi hak pekerja adalah sebesar **{total_bulan} bulan upah atau Rp{nominal_total}**, belum termasuk UPH.

**C. KETETAPAN**

Berdasarkan alasan dan proses penyelesaian sebagaimana telah diuraikan, perusahaan memutuskan Pemutusan Hubungan Kerja terhadap **{nama_pekerja}**, yang berlaku efektif sejak tanggal **{tanggal_efektif}**.

Sejak tanggal tersebut, hubungan kerja antara perusahaan dan pekerja dinyatakan berakhir sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.

Demikian surat keputusan ini dibuat untuk diketahui dan dilaksanakan sebagaimana mestinya.

Hormat kami,
**{nama_perusahaan}**

[Tanda tangan dan stempel perusahaan]

**{nama_penandatangan}**
{jabatan_penandatangan}

---

## LAMPIRAN — DASAR HUKUM

{LAMPIRAN}`,
};
