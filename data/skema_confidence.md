# Skema Confidence dan Dasar Keyakinan

Kolom `confidence` dan `dasar_keyakinan` di `data/*.csv` adalah **metadata audit**.
Keduanya **tidak masuk ke Turtle**. Yang masuk Turtle hanya metadata bermakna:
`ktn:pasal` dan `dct:source`. Confidence dipakai manusia dan query DuckDB untuk
menentukan elemen mana yang perlu dicek ulang.

## Arti rentang confidence

| Rentang | Label | Arti |
|---|---|---|
| 0.90 - 1.00 | dikutip | teks atau angka diambil persis dari pasal sumber, tanpa tafsir, nilai pasti untuk saat ini |
| 0.70 - 0.89 | tafsir | dikutip tetapi perlu pemetaan atau peringkasan, atau ada rujukan silang antar pasal |
| 0.50 - 0.69 | dinamis | nilainya berubah menurut waktu atau wilayah, atau sumber berpotensi sudah diubah aturan lain |
| 0.30 - 0.49 | dinamis_berat | bersumber dari bahan sekunder, bukan dokumen resmi |
| 0.00 - 0.29 | tidak dipakai | meragukan atau bertentangan, jangan dipakai |

## Arti kolom dasar_keyakinan

| Nilai | Arti |
|---|---|
| `dikutip` | langsung dari pasal sumber |
| `tafsir` | butuh pemetaan konsep atau menyimpulkan hal yang tidak dinyatakan eksplisit |
| `dinamis` | nilainya berubah menurut waktu (mis. usia pensiun yang naik bertahap) |
| `tidak_lengkap` | normanya benar, tetapi angka pendukung tidak disimpan (mis. upah minimum per wilayah) |

## Aturan perlu_verifikasi (diturunkan, bukan kolom)

Sebuah elemen dianggap perlu diverifikasi bila:

```
confidence < 0.7  OR  dasar_keyakinan IN ('dinamis', 'tidak_lengkap')
```

Flag ini **tidak disimpan** sebagai kolom dan tidak masuk Turtle. Ia hanya
diturunkan di `data/queries.sql` (view `perlu_cek`), agar tidak ada metadata
fungsional yang diperbanyak.

## Contoh query

```sql
-- semua yang perlu dicek, terurut dari yang paling tidak yakin
SELECT * FROM perlu_cek;

-- semua yang nilainya dinamis atau tidak lengkap
SELECT * FROM dinamis;

-- sebaran confidence di semua tabel
SELECT * FROM sebaran_confidence;
```

Jalankan: `duckdb < data/queries.sql`, atau interaktif dengan `.read data/queries.sql`.
