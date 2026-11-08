# Kontrak KB dan backend

Dokumen ini menyepakati apa yang backend tulis ke ABox dan apa yang rule SWRL
hasilkan. Aturan dan nama properti final tetap milik area KB (Anin). Backend
hanya konsumen.

## Prinsip

- Backend membuat ABox kasus dari input user.
- Rule SWRL membaca ABox itu dan menghasilkan data property hasil hitung.
- Backend membaca data property hasil inferensi, lalu memetakannya ke response API.
- `hak` tetap dibaca dari class assertion hasil reasoning, bukan dari SWRL.
- Kalau output SWRL belum ada, backend memakai fallback Java.

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

- `java`: hitung di Java, abaikan output SWRL.
- `swrl`: hanya baca output SWRL, gagal kalau tidak ada.
- `auto`: coba SWRL, fallback Java.

Untuk pengembangan, `java`. Setelah rule Anin siap, `auto`, lalu `swrl` untuk
demo.

## Yang perlu dikonfirmasi ke Anin

1. Nama properti output final.
2. Tipe data: `xsd:decimal` atau `xsd:integer`.
3. Apakah `nominalPesangon` berarti total UP + UPMK, atau hanya UP.
4. Apakah rule juga menghasilkan `pasal` per komponen, atau backend mengambil
   dari individu norma seperti sekarang.
5. Apakah semua perhitungan masuk SWRL, atau kategori tetap di backend.
