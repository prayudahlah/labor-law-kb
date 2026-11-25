# Handoff Backend — Dokumen Template (Semua Jenis)

Status: **frontend Surat PHK sudah jalan dengan mock; backend mengerjakan semua
template.**

Prinsip:

- Rujukan hukum **selalu** dari KB (nama individu ontologi), bukan teks pasal.
- Angka hak dari `/infer` (SWRL), bukan hitungan backend/frontend.
- Teks surat ada di YAML backend; frontend hanya merender `fields` + `template`.
- Frontend memetakan `DokumenPreset.id` → `grup` template.

Yang sudah ada di frontend dan tidak perlu diubah lagi:

| | |
|---|---|
| Editor | `frontend/src/components/dokumen/SuratPhkEditor.tsx` |
| Mock (sementara) | `frontend/src/lib/suratPhk.ts` |
| Riwayat | menyimpan `fakta`, `suratTeks`, `ringkasan`, `pasal`, `varian` |
| Hitung PHK | `/infer` topik `PHK` (SWRL) |

---

## 1. API

### 1.1 `GET /dokumen/jenis` (baru)

Frontend butuh definisi form **sebelum** user mengisi apa pun.

```json
[
  {
    "kode": "surat_phk_pemberitahuan",
    "grup": "DokumenSuratPHK",
    "varian": "pemberitahuan",
    "judul": "Surat Pemberitahuan PHK",
    "fields": [
      {
        "key": "nama_perusahaan",
        "label": "Nama perusahaan",
        "tipe": "text",
        "wajib": true,
        "pilihan": [],
        "placeholder": "PT Maju Jaya",
        "bantuan": ""
      }
    ]
  },
  {
    "kode": "surat_phk_keputusan",
    "grup": "DokumenSuratPHK",
    "varian": "keputusan",
    "judul": "Surat Keputusan PHK",
    "fields": []
  }
]
```

Aturan:

- `grup` = id dari `GET /ketentuan/dokumen` (`DokumenPKWT`, dst.).
- `varian` null bila hanya satu bentuk; dua entri bila variannya berbeda.
- `fields` sama persis dengan yang dipakai `POST /dokumen`.
- Endpoint ini tidak memanggil SWRL dan tidak memvalidasi fakta.

### 1.2 `POST /dokumen`

```http
POST /dokumen
Content-Type: application/json
```

```json
{
  "sesi": "d1",
  "dokumen": "surat_phk_pemberitahuan",
  "topik": [],
  "fakta": {
    "nama_perusahaan": "PT Maju Jaya",
    "alamat_perusahaan": "Jl. Slamet Riyadi 1, Surakarta",
    "kontak": "0271-123456",
    "nomor_surat": "12/PHK/XI/2026",
    "tempat": "Surakarta",
    "tanggal_surat": "2026-11-10",
    "nama_pekerja": "Budi Santoso",
    "jabatan_pekerja": "Operator Produksi",
    "alamat_pekerja": "Jl. Melati 2, Surakarta",
    "masa_kerja_bulan": 120,
    "upah_bulanan": 5000000,
    "alasan_phk": "EfisiensiRugi",
    "tanggal_efektif": "2026-12-01",
    "nama_penandatangan": "Siti Aminah",
    "jabatan_penandatangan": "HRD Manager"
  }
}
```

Respons:

```json
{
  "mode": "dokumen",
  "dokumen": "surat_phk_pemberitahuan",
  "judul": "Surat Pemberitahuan PHK",
  "wajib": [],
  "opsional": [],
  "template": "PT Maju Jaya\nJl. Slamet Riyadi 1, Surakarta\n...",
  "pasal": ["Pasal 37 ayat (3)", "Pasal 40 ayat (1)", "Pasal 40 ayat (4)", "Pasal 43 ayat (1)"],
  "catatan": "Draf, bukan nasihat hukum.",
  "fields": [],
  "lampiran": [
    {
      "pasal": "Pasal 43 ayat (1)",
      "judul": "Peraturan Pemerintah Nomor 35 Tahun 2021",
      "tautan": "https://peraturan.bpk.go.id/Details/161904/pp-no-35-tahun-2021"
    }
  ]
}
```

Catatan:

- `template` = teks surat **yang sudah dirender** (halaman 1 + lampiran).
- `lampiran` = halaman 2.
- `wajib`/`opsional` dipertahankan untuk kompatibilitas Peraturan Perusahaan.
- Error: `422` + `{"detail": "..."}`.

---

## 2. Pemetaan dokumen → kode

| `DokumenPreset.id` | `kode` template | Hitung |
|---|---|---|
| `DokumenSuratPHK` | `surat_phk_pemberitahuan`, `surat_phk_keputusan` | PHK |
| `DokumenPKWT` | `perjanjian_pkwt` | PKWT |
| `DokumenPKWTT` | `perjanjian_pkwtt` | — |
| `DokumenPerjanjianAlihDaya` | `perjanjian_alih_daya` | — |
| `DokumenSuratPerintahLembur` | `surat_perintah_lembur` | Lembur |
| `DokumenSlipUpah` | `slip_upah` | Jamsos |
| `DokumenSuratCuti` | `surat_keterangan_cuti` | Cuti / KIA |
| `DokumenRPTKA` | `rptka` | — |
| `DokumenPendaftaranJamsos` | `pendaftaran_jamsos` | Jamsos |
| `DokumenPeraturanPerusahaan` | `peraturan_perusahaan` | sudah ada |

---

## 3. Blok `hitung` generik

Jangan hardcode `hitung: PHK`; gunakan peta fakta/hasil:

```yaml
hitung:
  topik: Lembur
  fakta:            # key /infer → key form
    upahBulanan: upah_bulanan
    jamLembur: jam_lembur
    jenisHari: jenis_hari
  hasil:            # placeholder → key rincian
    jam: jam
    upah_sejam: upah_sejam
    nominal_lembur: nominal
```

- `fakta`: kiri = nama field `/infer`, kanan = key di `fakta` request.
- `hasil`: kiri = placeholder, kanan = key `rincian` atau `nominal`.
- Konversi angka dilakukan backend sebelum `/infer`.
- PHK dapat ditulis dengan bentuk yang sama:

```yaml
hitung:
  topik: PHK
  fakta:
    masaKerjaBulan: masa_kerja_bulan
    upahBulanan: upah_bulanan
    alasanPHK: alasan_phk
  hasil:
    bulan_up: pesangon_bulan
    bulan_upmk: upmk_bulan
    total_bulan: total_bulan
```

Rupiah per komponen dihitung backend:

```text
nominal_up    = round(bulan_up   × upah_bulanan)
nominal_upmk  = round(bulan_upmk × upah_bulanan)
nominal_total = nominal_up + nominal_upmk
```

---

## 4. Field bersama

| key | tipe | wajib |
|---|---|---|
| `nama_perusahaan` | text | ya |
| `alamat_perusahaan` | textarea | ya |
| `kontak` | text | tidak |
| `nomor_surat` | text | ya |
| `tempat` | text | ya |
| `tanggal_surat` | date | ya |
| `nama_penandatangan` | text | ya |
| `jabatan_penandatangan` | text | ya |

Identitas pekerja yang sering muncul:

| key | tipe | catatan |
|---|---|---|
| `nama_pekerja` | text | wajib |
| `nik` | text | wajib untuk PKWT/PKWTT/Jamsos |
| `alamat_pekerja` | textarea | wajib |
| `jabatan_pekerja` | text | wajib |

Format nilai:

- tanggal: `YYYY-MM-DD` masuk, `1 November 2026` keluar.
- rupiah: `5000000` masuk, `5.000.000` keluar.
- desimal: `4,5` (koma).

---

## 5. Surat PHK

### 5.1 Varian

| | Pemberitahuan | Keputusan |
|---|---|---|
| Kode | `surat_phk_pemberitahuan` | `surat_phk_keputusan` |
| Dasar | Pasal 37 ayat (3) | Setelah proses selesai |
| Kata kunci | “memberitahukan rencana PHK” | “memutuskan PHK” |
| Penolakan 7 hari | ada | tidak ada |

### 5.2 Field tambahan (bersama)

| key | tipe | wajib |
|---|---|---|
| `nama_pekerja` | text | ya |
| `jabatan_pekerja` | text | ya |
| `alamat_pekerja` | textarea | ya |
| `masa_kerja_bulan` | number | ya |
| `upah_bulanan` | number | ya |
| `alasan_phk` | select | ya |
| `tanggal_efektif` | date | ya |

### 5.3 Field khusus keputusan

| key | tipe | wajib |
|---|---|---|
| `tanggal_pemberitahuan` | date | ya |
| `nomor_pemberitahuan` | text | tidak |
| `status_penolakan` | select | ya |
| `nomor_kesepakatan` | text | jika `bipartit_selesai` |
| `tanggal_kesepakatan` | date | jika `bipartit_selesai` |
| `nomor_putusan` | text | jika `putusan_phi` |
| `tanggal_putusan` | date | jika `putusan_phi` |

`status_penolakan`: `tidak_ada_penolakan` | `bipartit_selesai` | `putusan_phi`.

`alasan_phk` = nama individu ontologi (`EfisiensiRugi`, `Mangkir`, …). Daftar
yang dipakai frontend ada di `lib/suratPhk.ts` (19 alasan yang suratnya
diterbitkan perusahaan).

### 5.4 Rujukan dari KB

```yaml
rujukan:
  pasal_uph: LingkupUPH
  pasal_penolakan: PenolakanPHK
  pasal_pelaporan: PelaporanPHK
  pasal_bipartit: PenyelesaianPerselisihanPHK

dasar_hukum:
  umum: [PemberitahuanPHK, HakAtasPesangonUPMKUPH, LingkupUPH]
  alasan: true
```

Individu yang tersedia (PP 35/2021):

```text
PemberitahuanPHK             Pasal 37 ayat (3)
PelaporanPHK                 Pasal 38
PenolakanPHK                 Pasal 39 ayat (1)
PenyelesaianPerselisihanPHK  Pasal 39 ayat (2)
HakAtasPesangonUPMKUPH       Pasal 40 ayat (1)
LingkupUPH                   Pasal 40 ayat (4)
EfisiensiRugi                Pasal 43 ayat (1)
```

### 5.5 Struktur

```text
halaman 1: kop, nomor, tujuan, identitas, alasan, hak, penutup, tanda tangan
---
halaman 2: LAMPIRAN — DASAR HUKUM
```

Aturan: tanpa HTML, tanggal hanya di atas, UPH sebagai kalimat (tanpa
nominal), pemberitahuan memuat hak menolak 7 hari kerja.

### 5.6 Contoh acuan

120 bulan, Rp5 juta, `EfisiensiRugi`:

```text
bulan_up = 4,5 · bulan_upmk = 4 · total_bulan = 8,5
nominal_up = 22.500.000 · nominal_upmk = 20.000.000 · nominal_total = 42.500.000
```

---

## 6. PKWT — `perjanjian_pkwt`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nik` | text | ya |
| `tempat_lahir`, `tanggal_lahir` | text, date | tidak |
| `jenis_pekerjaan` | text | ya |
| `lokasi_kerja` | text | ya |
| `tanggal_mulai` | date | ya |
| `tanggal_selesai` | date | ya |
| `upah_bulanan` | number | ya |
| `jam_kerja` | text | tidak |

**Hitung**: `PKWT`
`fakta: { masaKerjaBulan: masa_kerja_bulan, upahBulanan: upah_bulanan }`
`hasil: { kompensasi_bulan: kompensasi_bulan, nominal_kompensasi: nominal }`

`masa_kerja_bulan` dihitung backend dari selisih tanggal (bulan penuh).

**Dasar hukum**

```yaml
umum: [DasarPKWT, FormalitasPKWT, BatasJangkaWaktuPKWT,
       LaranganPKWTPekerjaanTetap, KetentuanPencatatanPKWT,
       KetentuanUangKompensasiPKWT, BesaranUangKompensasiPKWT]
```

**Validasi**: `tanggal_selesai > tanggal_mulai`; total jangka waktu ≤ 60 bulan
(Pasal 8 ayat (1) PP 35/2021).

**Kerangka**: para pihak → dasar → jenis & lingkup pekerjaan → jangka waktu →
upah → hak/kewajiban → kompensasi → penutup.

---

## 7. PKWTT — `perjanjian_pkwtt`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nik` | text | ya |
| `tempat_lahir`, `tanggal_lahir` | text, date | tidak |
| `lokasi_kerja` | text | ya |
| `tanggal_mulai` | date | ya |
| `masa_percobaan_bulan` | number | tidak (0–3) |
| `upah_bulanan` | number | ya |

**Hitung**: —

**Dasar hukum**

```yaml
umum: [DasarPKWT, FormalitasPKWT, MasaPercobaanPKWTT,
       AlasanPerjanjianKerjaBerakhir]
```

**Validasi**: `masa_percobaan_bulan ≤ 3`.

**Kerangka**: para pihak → dasar → jabatan & lingkup → mulai kerja → masa
percobaan → upah → hak/kewajiban → pengakhiran → penutup.

---

## 8. Alih Daya — `perjanjian_alih_daya`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nama_penyedia`, `alamat_penyedia` | text, textarea | ya |
| `nama_pengguna`, `alamat_pengguna` | text, textarea | ya |
| `objek_pekerjaan` | textarea | ya |
| `lokasi_kerja` | text | ya |
| `jumlah_pekerja` | number | ya |
| `jenis_pekerjaan` | text | ya |
| `tanggal_mulai`, `tanggal_selesai` | date | ya |
| `upah_bulanan` | number | ya |
| `jaminan_perlindungan` | textarea | tidak |

**Hitung**: —

**Dasar hukum**

```yaml
umum: [PerjanjianAlihDayaTertulis, DasarPerjanjianAlihDaya,
       TanggungJawabPerlindunganAlihDaya, SyaratPengalihanHakAlihDaya,
       FormalitasBadanHukumAlihDaya, KetentuanHubunganKerjaAlihDaya,
       PerlindunganPekerjaAlihDaya]
```

**Validasi**: `tanggal_selesai > tanggal_mulai`; `jumlah_pekerja ≥ 1`.

**Kerangka**: para pihak → dasar → objek/lokasi → jumlah & kualifikasi →
jangka waktu → upah & perlindungan → pengalihan hak → penutup.

---

## 9. Surat Perintah Lembur — `surat_perintah_lembur`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nama_pekerja`, `jabatan_pekerja` | text | ya |
| `tanggal_lembur` | date | ya |
| `jam_mulai`, `jam_selesai` | text (`HH:MM`) | ya |
| `jam_lembur` | number | ya |
| `jenis_hari` | select | ya |
| `upah_bulanan` | number | ya |
| `uraian_pekerjaan` | textarea | ya |

`jenis_hari`: `hari_kerja` | `libur_5hari`.

**Hitung**: `Lembur`
`hasil: { jam: jam, upah_sejam: upah_sejam, nominal_lembur: nominal }`

**Dasar hukum**

```yaml
umum: [SyaratPerintahLembur, PersetujuanPekerjaLembur, BatasWaktuKerjaLembur,
       BatasJamLembur, KewajibanBayarUpahLembur, UpahSejamLembur,
       DasarPerhitunganUpahLembur]
```

**Validasi**: `jam_selesai > jam_mulai`; `jam_lembur ≤ 4`; peringatan bila total
mingguan > 18 jam.

**Kerangka**: identitas pekerja → perintah & uraian → tanggal/jam → dasar upah
→ rincian upah lembur → penutup.

---

## 10. Slip Upah — `slip_upah`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nama_pekerja`, `jabatan_pekerja` | text | ya |
| `periode` | text | ya (`November 2026`) |
| `upah_pokok` | number | ya |
| `tunjangan_tetap` | number | tidak |
| `tunjangan_tidak_tetap` | number | tidak |
| `potongan_pph` | number | tidak |
| `potongan_lain` | number | tidak |

**Hitung**: `Jamsos`
`fakta: { upahBulanan: upah_pokok }`
`hasil: { persen_pekerja, persen_pengusaha, iuran_pekerja, iuran_pengusaha }`

Backend menghitung `upah_bruto` dan `upah_neto`:

```text
upah_bruto = upah_pokok + tunjangan_tetap + tunjangan_tidak_tetap
upah_neto  = upah_bruto − iuran_pekerja − potongan_pph − potongan_lain
```

**Dasar hukum**

```yaml
umum: [HakPenghidupanLayakUu62023, UpahTimbulSaatHubunganKerja,
       KewajibanBayarUpahSesuaiKesepakatan, UpahBerdasarkanSatuanWaktuHasil,
       DendaKeterlambatanUpahUu62023, JamsosIuranTanggungPemberiKerja]
```

**Validasi**: `potongan total ≤ upah_bruto`.

**Kerangka**: identitas & periode → komponen upah → potongan → upah bersih →
catatan pembayaran.

---

## 11. Surat Keterangan Cuti — `surat_keterangan_cuti`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nama_pekerja`, `jabatan_pekerja` | text | ya |
| `jenis_cuti` | select | ya |
| `tanggal_mulai`, `tanggal_selesai` | date | ya |
| `jumlah_hari` | number | ya |
| `masa_kerja_bulan` | number | ya |
| `upah_bulanan` | number | tidak |
| `cuti_melahirkan_bulan` | number | jika melahirkan |

`jenis_cuti`: `tahunan` | `haid` | `menikah` | `keluarga` | `kematian` |
`melahirkan` | `keguguran`.

Pemetaan ke `peristiwa` `/infer`:

| jenis_cuti | peristiwa |
|---|---|
| haid | `CutiHaid` |
| menikah | `UpahCutiMenikah` |
| keluarga | `UpahCutiKeluarga2Hari` |
| kematian | `UpahCutiKematianSerumah` |
| keguguran | `CutiKeguguran` |
| melahirkan | topik `KIA` |

**Hitung**: `Cuti` (selain melahirkan) atau `KIA` (melahirkan).

**Dasar hukum**

```yaml
tahunan:    [CutiTahunan12HariUu62023]
haid:       [CutiHaid]
menikah:    [UpahCutiMenikah]
keluarga:   [UpahCutiKeluarga2Hari]
kematian:   [UpahCutiKematianSerumah]
keguguran:  [CutiKeguguran]
melahirkan: [KetentuanCutiMelahirkan, KetentuanUpahCutiMelahirkan]
```

**Validasi**: `tanggal_selesai ≥ tanggal_mulai`; cuti tahunan ≤ 12 hari; cuti
melahirkan 3 bulan (atau sesuai field).

**Kerangka**: identitas → jenis & alasan → tanggal & jumlah hari → hak upah
selama cuti → penutup.

---

## 12. RPTKA — `rptka`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `jabatan_tka` | text | ya |
| `jumlah_tka` | number | ya |
| `negara_asal` | text | tidak |
| `lokasi_kerja` | text | ya |
| `jangka_waktu_bulan` | number | ya |
| `alasan_kebutuhan` | textarea | ya |
| `pendamping_wni` | text | ya |

**Hitung**: —

**Dasar hukum**

```yaml
umum: [RencanaPenggunaanTKAUu62023, LaranganPemberiKerjaPerseoranganTKA,
       BatasJabatanWaktuTKA, LaranganJabatanPersonaliaTKAUu62023,
       TenagaPendampingTKA, PelatihanKerjaPendampingTKA,
       PemulanganTKAUu62023]
```

**Validasi**: `jumlah_tka ≥ 1`; `jangka_waktu_bulan ≥ 1`; jabatan bukan
jabatan personalia.

**Kerangka**: identitas perusahaan → jabatan & jumlah → alasan → lokasi &
jangka waktu → pendamping WNI → penutup.

---

## 13. Pendaftaran Jamsos — `pendaftaran_jamsos`

**Field tambahan**

| key | tipe | wajib |
|---|---|---|
| `nama_pekerja`, `nik`, `alamat_pekerja` | text/textarea | ya |
| `tanggal_lahir` | date | tidak |
| `upah_bulanan` | number | ya |
| `program` | text | ya (`JKK, JKM, JHT, JP, JKP`) |
| `tingkat_risiko` | select | ya |
| `tanggal_daftar` | date | ya |

`tingkat_risiko`: `sangat_rendah` | `rendah` | `sedang` | `tinggi` |
`sangat_tinggi`.

**Hitung**: `Jamsos`
`hasil: { persen_pekerja, persen_pengusaha, iuran_pekerja, iuran_pengusaha }`

**Dasar hukum**

```yaml
umum: [JamsosIuranTanggungPemberiKerja, JHTIuranTanggungPemberiKerja, IuranJKP]
```

**Validasi**: `upah_bulanan > 0`.

**Kerangka**: identitas perusahaan → identitas pekerja → program & upah →
iuran pekerja/pengusaha → tanggal efektif → penutup.

Catatan: tarif JKK bergantung `tingkat_risiko`; bila dicantumkan, backend dapat
menambah individu program (`JKK-R1` … `JKK-R5`) secara kondisional.

---

## 14. Peraturan Perusahaan

Sudah berjalan dengan `peraturan_perusahaan.yml` dan `bagian/klausul`. Tidak
diubah pada fase ini; migrasi ke pola `field` bisa dilakukan terakhir.

---

## 15. Checklist backend

- [ ] `GET /dokumen/jenis` (metadata + fields)
- [ ] `hitung` generik (topik + peta fakta + peta hasil)
- [ ] 2 YAML PHK (pemberitahuan, keputusan)
- [ ] 8 YAML dokumen lain
- [ ] Resolusi rujukan dari ontologi (`ktn:pasal`, `dct:source`,
      `ktn:tautanSumber`)
- [ ] Format tanggal Indonesia, rupiah, desimal koma
- [ ] Validasi wajib + aturan per dokumen
- [ ] Lampiran halaman 2 untuk setiap surat
- [ ] `peraturan_perusahaan` tidak berubah
- [ ] Test minimal satu kasus per dokumen

---

## 16. Test case minimum

| Dokumen | Kasus | Harapan |
|---|---|---|
| PHK | 120 bulan, Rp5 jt, `EfisiensiRugi` | `Rp42.500.000`, `Pasal 43 ayat (1)` |
| PHK | 6 bulan, Rp12 jt, `EfisiensiRugi` | `Rp6.000.000`, UPMK 0 |
| PHK keputusan | `bipartit_selesai` tanpa nomor | `422` |
| PKWT | 24 bulan, Rp5 jt | kompensasi 2 bulan → `Rp10.000.000` |
| PKWT | 25 bulan | 2,0833… bulan (desimal) |
| PKWTT | masa percobaan 5 bulan | `422` |
| Lembur | 4 jam hari kerja, Rp5 jt | upah/jam 28.901,73; nominal 216.763 |
| Slip Upah | pokok 5 jt, tunjangan 500 rb | iuran pekerja 3%; neto benar |
| Cuti | tahunan | 12 hari |
| Cuti | haid | 2 hari |
| Cuti | melahirkan 3 bulan, Rp5 jt | upah 3 bulan |
| RPTKA | jumlah 0 | `422` |
| Jamsos | upah 5 jt | 3% / 5,7% (150.000 / 285.000) |
| Alih Daya | tanggal selesai < mulai | `422` |
| Peraturan Perusahaan | tetap | `200` |

---

## 17. Setelah backend selesai (frontend)

1. Hapus mock `frontend/src/lib/suratPhk.ts`.
2. Generalisasi `SuratPhkEditor` menjadi `DokumenFormEditor`:
   - ambil `fields` dari `GET /dokumen/jenis` berdasarkan `grup`;
   - varian dari entri dengan `grup` yang sama;
   - `POST /dokumen` saat **Susun**;
   - checklist + ringkasan tetap seperti sekarang.
3. Delapan jenis lain otomatis memakai editor yang sama; tidak ada form
   hardcode per dokumen.

---

## 18. Yang tidak berubah

- SWRL, aturan inferensi, data ontologi.
- Endpoint `/infer` dan `/ketentuan`.
