# Kontrak KB dan backend

Dokumen ini menyepakati apa yang backend tulis ke ABox dan apa yang rule SWRL
hasilkan. Aturan dan nama properti final tetap milik area KB (Anin). Backend
hanya konsumen.

## Prinsip

- Backend membuat ABox kasus dari input user.
- Rule SWRL membaca ABox itu dan menghasilkan data property hasil hitung.
- Backend membaca data property hasil inferensi, lalu memetakannya ke response API.
- `hak` tetap dibaca dari class assertion hasil reasoning, bukan dari SWRL.
- Di mode `auto`, backend memakai fallback Java kalau output SWRL belum ada.
  Mode `swrl` tidak memakai fallback.

## Properti input dari backend

| Topik | Properti ABox |
|---|---|
| PHK | `masaKerjaBulan`, `upahBulanan`, `bentukHubunganKerja`, `mengalami`, `memilikiAlasanPHK` |
| Lembur | `jamLembur`, `padaHariKerja`, `upahBulanan` |
| PKWT | `bentukHubunganKerja`, `masaKerjaBulan`, `upahBulanan` |
| Jamsos | `upahBulanan` |
| KIA | `cutiMelahirkanBulan`, `upahBulanan` |
| Cuti | `masaKerjaBulan`, `perempuan`, `mengalamiPeristiwa` |

## Properti output SWRL

Nama di bawah ini usulan. Kalau Anin memilih nama lain, backend memetakan di
satu tempat, yaitu `SwrlCalculationProvider`.

| Topik | Properti output | Tipe | Response API |
|---|---|---|---|
| PHK | `bulanUP` | decimal | `rincian.pesangon_bulan` |
| PHK | `bulanUPMK` | decimal | `rincian.upmk_bulan` |
| PHK | `totalBulan` | decimal | `rincian.total_bulan` |
| PHK | `nominalPesangon` | decimal | `nominal` |
| Lembur | `upahSejam` | decimal | `rincian.upah_sejam` |
| Lembur | `nominalLembur` | decimal | `nominal` |
| PKWT | `kompensasiBulan` | decimal | `rincian.kompensasi_bulan` |
| PKWT | `nominalKompensasiPKWT` | decimal | `nominal` |
| Jamsos | `persenPekerja` | decimal | `rincian.persen_pekerja` |
| Jamsos | `persenPengusaha` | decimal | `rincian.persen_pengusaha` |
| Jamsos | `iuranPekerja` | decimal | `rincian.iuran_pekerja`, `nominal` |
| Jamsos | `iuranPengusaha` | decimal | `rincian.iuran_pengusaha` |
| KIA | `totalBulanUpah` | decimal | `rincian.upah_bulan` |
| KIA | `nominalUpahCutiMelahirkan` | decimal | `nominal` |
| Cuti | `cutiTahunanHari` | integer | `rincian.cuti_tahunan_hari` |
| Cuti | `hariDibayar` | integer | `rincian.hari_dibayar` |

## Contoh PHK

ABox yang backend tulis:

```turtle
ktn:KasusPekerja a ktn:Pekerja ;
    ktn:masaKerjaBulan 120 ;
    ktn:upahBulanan 5000000 ;
    ktn:bentukHubunganKerja "PKWTT" ;
    ktn:mengalami ktn:KasusPHK .

ktn:KasusPHK a ktn:PHK ;
    ktn:memilikiAlasanPHK ktn:EfisiensiRugi .
```

Yang rule SWRL hasilkan:

```turtle
ktn:KasusPekerja
    ktn:bulanUP 4.5 ;
    ktn:bulanUPMK 4.0 ;
    ktn:totalBulan 8.5 ;
    ktn:nominalPesangon 42500000 .
```

## Mode backend

`kb.calculation.mode`:

- `swrl`: default. Hanya baca output SWRL, gagal kalau tidak ada.
- `auto`: coba SWRL, fallback Java. Jalur transisi, bukan untuk demo.
- `java`: hitung di Java. Jalur legacy, tidak dipakai untuk demo.

## Yang perlu dikonfirmasi ke Anin

1. Nama properti output final.
2. Tipe data: `xsd:decimal` atau `xsd:integer`.
3. Apakah `nominalPesangon` berarti total UP + UPMK, atau hanya UP.
4. Apakah rule juga menghasilkan `pasal` per komponen, atau backend mengambil
   dari individu norma seperti sekarang.
5. Apakah semua perhitungan masuk SWRL, atau kategori tetap di backend.

## Status implementasi

Rule sudah tersedia dan diuji end-to-end.

- Modul: `ontology/core/swrl-kalkulasi.rdf` (29 rule, digenerate
  `scripts/build_swrl.py`, diimpor otomatis oleh `ontology/ontology.rdf`).
- Properti output dan antara dideklarasikan di `ontology/core/tbox-core.rdf`
  (`upDasar`, `upmkDasar`, `bulanUP`, `nominalPesangon`, `upahSejam`,
  `kompensasiBulan`, `iuranPekerja`, `cutiTahunanHari`, dst.).
- Cakupan: PHK (19 rule, termasuk UPMK 0 untuk masa kerja < 36 bulan), PKWT,
  Jamsos, KIA, Lembur (5 rule), Cuti tahunan.
- Uji: `backend/src/test/java/ac/id/uns/kbr/SwrlKalkulasiTest.java` (15 tes)
  membandingkan hasil SWRL dengan `golden-cases.json`, termasuk PKWT
  non-kelipatan 12, batas KIA, bracket PHK, PHK 6 bulan, dan lembur hari libur.
- CI `kb` menjalankan ulang `build_ontology.py`, `build_swrl.py`, dan
  `build_catalog.py` lalu `git diff --exit-code` untuk mendeteksi berkas
  generated yang tertinggal.
- CI juga menjalankan `InferControllerTest` dengan `KB_CALC_MODE=swrl`, jadi
  jalur API tanpa fallback Java ikut diuji.
- Mode default `swrl`; `java` dan `auto` adalah jalur legacy/transisi.

Keputusan yang sudah diambil:

1. Nama properti mengikuti tabel di atas; tidak ada pemetaan tambahan.
2. Semua nominal dan bulan memakai `xsd:decimal`; `upDasar`/`upmkDasar` dan
   `cutiTahunanHari` memakai `xsd:integer`.
3. `nominalPesangon` = total UP + UPMK dikali upah bulanan.
4. `pasal` tetap diambil backend dari individu norma (tidak lewat SWRL).
5. Kategori UP/UPMK dihitung SWRL; pemetaan hak dan pembulatan tampilan tetap
   di backend.
6. UPMK untuk masa kerja < 36 bulan bernilai 0, bukan error. Aturan ini
   ditulis sebagai rule SWRL (`PHK-UPMK-0-36`).

Batas yang disepakati:

- Lembur progresif memakai tabel bantu `AkumulasiLembur` yang dihasilkan
  `scripts/build_ontology.py`. SWRL tidak punya agregasi, jadi total pengali
  dihitung saat build. Hanya untuk jam bulat; jam pecahan belum didukung
  (mode `auto` masih fallback ke Java, mode `swrl` gagal).
- `padaHariKerja=false` dipetakan ke `libur_5hari` karena input belum
  membedakan libur 6 hari dan libur terpendek.
- Cuti khusus (haid, keguguran, menikah) belum masuk SWRL. Jalur Java masih
  membaca `hariDibayar` dari individu peristiwa; SWRL hanya menghasilkan
  `cutiTahunanHari`.
- `scripts/check_ontology.py` memakai HermiT yang tidak mendukung semua builtin
  `swrlb`; jalankan dengan `--tanpa-swrl` untuk cek T-Box. Verifikasi rule
  memakai Openllet lewat `SwrlKalkulasiTest`.
