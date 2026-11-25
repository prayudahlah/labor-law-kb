# Handoff: Dokumen Template (Surat PHK)

Status: **frontend sudah jalan dengan mock; backend menyusul.**
Kontrak v1 — perubahan bentuk respons harus menaikkan versi.

| | |
|---|---|
| Frontend | `frontend/src/components/dokumen/SuratPhkEditor.tsx` |
| Mock (sementara) | `frontend/src/lib/suratPhk.ts` |
| Backend target | `POST /dokumen` (endpoint yang sudah ada) |

---

## 1. Yang sudah ada di frontend

- Form dirender dari `fields` (bukan hardcode di komponen).
- Dua varian: **Pemberitahuan** dan **Keputusan**.
- Tombol **Susun surat** memanggil `POST /dokumen`. Jika backend membalas
  `422` dengan detail `"dokumen tidak didukung"` (atau `404`), frontend
  memakai mock + `POST /infer` (SWRL) untuk angka pesangon.
- Panel ringkasan pasal terpisah: tombol `Buat/Perbarui ringkasan` dan
  `Lihat ringkasan` di panel kiri; `Lihat draf` di panel kanan.
- Riwayat menyimpan `fakta`, `suratTeks`, `ringkasan`, `pasal`, `varian`.

Begitu backend mendukung kode surat, mock otomatis tidak dipakai — tidak ada
flag yang perlu dimatikan.

---

## 2. Endpoint

```http
POST /dokumen
Content-Type: application/json
```

Kode yang harus didukung:

| Kode | Varian |
|---|---|
| `surat_phk_pemberitahuan` | rencana PHK (Pasal 37 ayat (3)) |
| `surat_phk_keputusan` | keputusan setelah proses selesai |
| `peraturan_perusahaan` | perilaku lama, jangan diubah |

### Request

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

Untuk `surat_phk_keputusan`, tambah:

```json
{
  "tanggal_pemberitahuan": "2026-11-10",
  "nomor_pemberitahuan": "12/PHK/XI/2026",
  "status_penolakan": "tidak_ada_penolakan",
  "nomor_kesepakatan": "",
  "tanggal_kesepakatan": "",
  "nomor_putusan": "",
  "tanggal_putusan": ""
}
```

### Response

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
  ],
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
- `fields` = definisi form; frontend memakai ini bila ada.
- `lampiran` = halaman 2.
- `wajib`/`opsional` tetap untuk kompatibilitas Peraturan Perusahaan; untuk
  surat baru isinya `[]`.
- Error: `422` + `{"detail": "..."}`.

---

## 3. Field

### Bersama (kedua varian)

| key | tipe | wajib |
|---|---|---|
| `nama_perusahaan` | text | ya |
| `alamat_perusahaan` | textarea | ya |
| `kontak` | text | tidak |
| `nomor_surat` | text | ya |
| `tempat` | text | ya |
| `tanggal_surat` | date | ya |
| `nama_pekerja` | text | ya |
| `jabatan_pekerja` | text | ya |
| `alamat_pekerja` | textarea | ya |
| `masa_kerja_bulan` | number | ya |
| `upah_bulanan` | number | ya |
| `alasan_phk` | select | ya |
| `tanggal_efektif` | date | ya |
| `nama_penandatangan` | text | ya |
| `jabatan_penandatangan` | text | ya |

### Khusus keputusan

| key | tipe | wajib |
|---|---|---|
| `tanggal_pemberitahuan` | date | ya |
| `nomor_pemberitahuan` | text | tidak |
| `status_penolakan` | select | ya |
| `nomor_kesepakatan` | text | jika `bipartit_selesai` |
| `tanggal_kesepakatan` | date | jika `bipartit_selesai` |
| `nomor_putusan` | text | jika `putusan_phi` |
| `tanggal_putusan` | date | jika `putusan_phi` |

Nilai `status_penolakan`:

- `tidak_ada_penolakan` — pekerja tidak menolak; laporkan sesuai Pasal 38.
- `bipartit_selesai` — **hanya** jika bipartit mencapai kesepakatan.
- `putusan_phi` — berdasarkan putusan PHI.

`alasan_phk` = nama individu ontologi (`EfisiensiRugi`, `Mangkir`, …), bukan
teks bebas. Daftar yang dipakai frontend ada di `lib/suratPhk.ts` (19 alasan
yang suratnya diterbitkan perusahaan).

---

## 4. Rujukan hukum (dari KB, jangan hardcode)

Template YAML menyebut **nama individu**, bukan teks pasal:

```yaml
rujukan:
  pasal_uph: LingkupUPH
  pasal_penolakan: PenolakanPHK
  pasal_pelaporan: PelaporanPHK
  pasal_bipartit: PenyelesaianPerselisihanPHK
  pasal_pemberitahuan: PemberitahuanPHK
  pasal_hak: HakAtasPesangonUPMKUPH

dasar_hukum:
  umum: [PemberitahuanPHK, HakAtasPesangonUPMKUPH, LingkupUPH]
  alasan: true
```

Backend meresolusi dari ontologi:

| Yang diambil | Properti |
|---|---|
| teks pasal | `ktn:pasal` |
| regulasi | `dct:source` → individu regulasi |
| judul regulasi | `dct:title` (potong sebelum "tentang") |
| tautan | `ktn:tautanSumber` |

Nama individu yang sudah tersedia (PP 35/2021):

```text
PemberitahuanPHK         Pasal 37 ayat (3)
PelaporanPHK             Pasal 38
PenolakanPHK             Pasal 39 ayat (1)
PenyelesaianPerselisihanPHK  Pasal 39 ayat (2)
HakAtasPesangonUPMKUPH   Pasal 40 ayat (1)
LingkupUPH               Pasal 40 ayat (4)
EfisiensiRugi            Pasal 43 ayat (1)
```

---

## 5. Nilai yang dihitung

| Placeholder | Sumber |
|---|---|
| `pasal_rujukan` | pasal individu `alasan_phk` |
| `regulasi` | regulasi sumber alasan (judul pendek) |
| `bulan_up` / `bulan_upmk` / `total_bulan` | `rincian.pesangon_bulan` / `upmk_bulan` / `total_bulan` dari `/infer` |
| `nominal_up` | `bulan_up × upah_bulanan`, dibulatkan ke rupiah |
| `nominal_upmk` | `bulan_upmk × upah_bulanan`, dibulatkan |
| `nominal_total` | `nominal_up + nominal_upmk` (bukan `total_bulan × upah`, agar tidak selisih pembulatan) |
| `masa_kerja` | `120` → `10 tahun (120 bulan)` |
| `upah_bulanan` | `5000000` → `5.000.000` |
| `tanggal_*` | `2026-11-10` → `10 November 2026` |
| `alasan_phk` | label manusia, mis. `efisiensi karena perusahaan mengalami kerugian` |
| `uraian_dasar_final` | dipilih dari `status_penolakan` |

Contoh acuan (PP 35/2021, 120 bulan, Rp5 juta, `EfisiensiRugi`):

```text
bulan_up = 4,5 · bulan_upmk = 4 · total_bulan = 8,5
nominal_up = 22.500.000 · nominal_upmk = 20.000.000 · nominal_total = 42.500.000
```

---

## 6. Struktur teks

```text
halaman 1: kop, nomor, tujuan, identitas, alasan, hak, penutup, tanda tangan
---
halaman 2: LAMPIRAN — DASAR HUKUM
           1. Pasal 37 ayat (3) — PP 35/2021 — <tautan>
           2. Pasal 40 ayat (1) — PP 35/2021 — <tautan>
           3. Pasal 40 ayat (4) — PP 35/2021 — <tautan>
           4. Pasal 43 ayat (1) — PP 35/2021 — <tautan>
```

Aturan:

- Jangan memakai HTML di template (`<div align="center">`); atur perataan di
  renderer.
- Tanggal hanya di blok atas; jangan diulang di tanda tangan.
- UPH ditulis sebagai kalimat sesuai Pasal 40 ayat (4), tanpa nominal.
- Surat pemberitahuan memuat hak menolak 7 hari kerja; surat keputusan tidak.

---

## 7. Perilaku frontend saat backend siap

1. `POST /dokumen` mengembalikan 200 + `fields` + `template` + `lampiran`.
2. Frontend memakai `fields` dari respons (bukan mock).
3. Mock `lib/suratPhk.ts` tidak lagi dipanggil; boleh dihapus setelah dua
   varian teruji.

Tidak ada perubahan kontrak yang diperlukan di sisi frontend.

---

## 8. Checklist backend

- [ ] `surat-phk-pemberitahuan.yml`
- [ ] `surat-phk-keputusan.yml`
- [ ] Muat semua `dokumen/*.yml` (jangan hardcode satu file)
- [ ] `NormResolver` (individu → pasal + regulasi + tautan)
- [ ] Panggil `InferenceService` bila `hitung: PHK`
- [ ] Format tanggal/rupiah/desimal
- [ ] `fields[]` dan `lampiran[]` di DTO
- [ ] Validasi field wajib + status kondisional
- [ ] `peraturan_perusahaan` tetap lolos
- [ ] Test: 2 varian + PP

---

## 9. Test case minimum

| Kasus | Harapan |
|---|---|
| Pemberitahuan, 120 bulan, Rp5 jt, `EfisiensiRugi` | `Pasal 43 ayat (1)`, `Pasal 39 ayat (1)`, `Rp42.500.000` |
| Pemberitahuan, 6 bulan, Rp12 jt, `EfisiensiRugi` | `Rp6.000.000`, UPMK 0 |
| Keputusan, `tidak_ada_penolakan` | memuat `Pasal 38`, tanpa kalimat penolakan |
| Keputusan, `bipartit_selesai` tanpa nomor | `422`, pesan jelas |
| Keputusan, `putusan_phi` | memuat nomor & tanggal putusan |
| `peraturan_perusahaan` | tetap 200 |

---

## 10. Yang tidak berubah

- SWRL, aturan inferensi, data ontologi.
- Endpoint `/infer` dan `/ketentuan`.
