# SPESIFIKASI EKSTRAKSI — KB Hukum Ketenagakerjaan Indonesia

Versi spec: **1.1.0** · Vocab: lihat `data/extraction/VOCAB.yaml`

Dokumen ini adalah **aturan kerja untuk model LLM** yang mengubah teks hukum
(markdown) menjadi fakta kanonik (record JSON). Tujuannya: membuat langkah
ekstraksi yang secara inheren non-deterministik menjadi **tertata, terperiksa,
dan dapat direproduksi**.

> Prototype edukasi. Bukan nasihat hukum.

---

## 1. Ruang lingkup

- **Dokumen**: hanya **Undang-Undang (UU)** dan **Peraturan Pemerintah (PP)**.
- **Isi**: hanya pasal yang relevan dengan penalaran hak ketenagakerjaan.
  Pasal di luar lingkup (definisi umum, kelembagaan, sanksi administratif,
  ketentuan peralihan/penutup, pidana) **tetap dicatat** di `cakupan.pasal_dilewati`.
- **Batas**: jangan menafsirkan melebihi teks. Bila butuh kelas/properti yang
  belum ada di T-Box, **jangan dipaksakan** — catat di `tidak_termodelkan`.
- Dokumen lama yang diubah: hanya **nilai yang berlaku saat ini** yang disimpan
  (lihat bagian 9).

---

## 2. Alur kerja & artefak

```
docs/markdown/<DOKUMEN_ID>.md          input (sudah ada)
    │  LLM, satu fase, mengikuti spec ini
    ▼
data/extraction/records/<DOKUMEN_ID>.json   Extraction Record (artefak kanonik)
    │  scripts/validate_extraction.py     (skema + enum + rujukan + cakupan)
    ▼
data/extraction/records/*.json          (status_review = reviewed)
    │  scripts/compile_extraction.py      (deterministik)
    ▼
data/*.csv  ──►  scripts/build_ontology.py  ──►  ontology/**/*.ttl
                                                └─► scripts/check_ontology.py (HermiT)
```

Aturan determinisme:

1. LLM **tidak** menulis CSV. LLM hanya menulis satu record JSON per dokumen.
2. Compiler yang menulis CSV, dengan urutan dan format angka yang pasti.
3. JSON dinormalkan: kunci terurut, indentasi 2 spasi, UTF-8, akhiran newline.
4. Belum ada `records/`? Jangan hapus CSV lama secara otomatis — compiler menulis ulang.

---

## 3. Definisi istilah

| Istilah | Definisi | Wujud di record |
|---|---|---|
| **Peraturan** | Dokumen UU/PP beserta metadata | `peraturan` |
| **Norma** | Satu proposisi hukum berpola **kondisi → akibat** yang bisa dinalar | elemen `norma[]` |
| **Parameter** | Angka yang dilampirkan ke satu norma (mis. pengali, batas) | `norma[].parameter[]` |
| **Kategori** | Baris tabel rentang masa kerja (pesangon/UPMK) | `kategori[]` |
| **Pengali lembur** | Baris tabel pengali upah lembur per jenis hari & rentang jam | `pengali_lembur[]` |
| **Program jamsos** | Program & tarif iuran jaminan sosial | `program_jamsos[]` |
| **Bukti** | Kutipan singkat verbatim dari sumber | `bukti` |
| **Amandemen** | Peraturan yang mengubah peraturan lain | `peraturan.diubah_oleh` |
| **Cakupan** | Daftar pasal yang ditinjau/dilewati | `cakupan` |
| **Tidak termodelkan** | Pasal relevan yang belum punya kelas/properti di T-Box | `tidak_termodelkan[]` |

Aturan "norma vs bukan norma": jadikan **norma** hanya bila ada subjek/kondisi
dan akibat hukum yang dapat dinyatakan sebagai individu OWL. Kalimat yang hanya
mendefinisikan istilah, mengatur tata cara internal, atau memuat sanksi
**bukan** norma — masukkan ke `cakupan.pasal_dilewati`.

---

## 4. Struktur record

Satu file: `data/extraction/records/<DOKUMEN_ID>.json`.
Kontrak lengkap (tipe, wajib/opsional) ada di
`data/extraction/schema/extraction.schema.json`.

```json
{
  "spec_version": "1.0.0",
  "vocab_version": "0.1.0",
  "dokumen_id": "PP-35-2021",
  "status_review": "draft",
  "peraturan": {
    "judul": "...", "jenis": "PP", "nomor": "35", "tahun": "2021",
    "sumber": "https://peraturan.bpk.go.id/...",
    "status": "Berlaku", "diubah_oleh": []
  },
  "norma": [ { "norm_id": "...", "topik": "...", "pasal": "...",
               "iri_individu": "ktn:...", "jenis": "...",
               "kondisi": "...", "akibat": "...",
               "parameter": [ {"nama":"...","nilai":"2","satuan":"kali","jenis":"pengali","pasal":"..."} ],
               "bukti": "...", "confidence": 0.95,
               "dasar_keyakinan": "dikutip", "catatan": "" } ],
  "kategori": [], "pengali_lembur": [], "program_jamsos": [],
  "cakupan": { "lengkap": true, "pasal_diekstrak": ["Pasal 40"],
               "pasal_dilewati": [ {"pasal":"Pasal 1","alasan":"definisi"} ],
               "catatan": "" },
  "tidak_termodelkan": [ {"pasal":"...","ringkasan":"...","alasan":"butuh kelas baru: ..."} ]
}
```

Field wajib: `spec_version`, `vocab_version`, `dokumen_id`, `status_review`,
`peraturan`, `norma`, `cakupan`. **Norma tanpa `bukti` ditolak.**

---

## 5. Taksonomi keluaran

Semua nilai yang boleh dipakai ada di `VOCAB.yaml` (jangan menebak dari ingatan):

- `norma.jenis` — mis. `AlasanPHK`, `KetentuanLembur`, `KetentuanPKWT`.
- `norma.parameter[].nama` — daftar parameter beserta `satuan` dan `jenis`.
- `kategori.nama_tabel` — `uang_pesangon` | `upmk`.
- `pengali_lembur.jenis_hari` — `hari_kerja` | `libur_6hari` | `libur_terpendek` | `libur_5hari`.
- `program_jamsos.jenis_program` — `JKK` | `JKM` | `JHT` | `JP`.

**Pertumbuhan kosakata**: bila butuh nilai baru, tambahkan dulu ke `VOCAB.yaml`
(naikkan `versi`, isi `riwayat`). Nilai baru yang menuntut kelas baru sekaligus
masuk `tidak_termodelkan` sampai T-Box diperluas.

---

## 6. Konvensi penamaan

- `dokumen_id`: `UU-<nomor>-<tahun>` atau `PP-<nomor>-<tahun>`.
  Untuk peraturan gabungan ("jo."), pakai `UU-12-2011-JO-13-2022`.
- `norm_id`: huruf besar, dipisah `-`, diawali kluster topik. Contoh:
  `PHK-EFISIENSI-RUGI`, `LEMBUR-RUMUS-SEJAM`, `PKWT-JANGKA-MAKS`.
- `iri_individu`: diawali `ktn:` lalu PascalCase, unik secara global.
  Contoh: `ktn:EfisiensiRugi`, `ktn:WaktuKerja6Hari`.
- `tabel_id`: mis. `UP-0-12`, `UPMK-36-72`.
- `program_id`: mis. `JKK-R1`, `JHT`.
- `pasal`: tulis apa adanya dari sumber, mis. `Pasal 43 ayat (1)`,
  `Pasal 93 ayat (4)a`.

Keunikan yang ditegakkan lintas semua record: `norm_id`, `iri_individu`,
`tabel_id`, `program_id`.

---

## 7. Aturan ekstraksi

1. **Granularitas**: satu norma per ayat/sub-ayat yang punya akibat berbeda.
   Ayat dengan akibat identik boleh digabung bila alasannya sama (isi `catatan`).
2. **Angka**: tulis sebagai string persis seperti di sumber; compiler yang
   menormalkan. Jangan pakai pemisah ribuan. Desimal dengan titik.
3. **Bukti**: kutipan pendek verbatim (bukan parafrase) yang memuat angka/kata kunci.
4. **Parameter**: buat parameter hanya untuk angka yang akan dipakai perhitungan.
   Setiap parameter menunjuk `pasal` asalnya.
5. **Antiduplikat**: jangan membuat dua `norm_id` untuk norma yang sama.
6. **Tanpa tafsir liar**: nilai yang tidak dinyatakan eksplisit → turunkan
   `confidence` dan isi `dasar_keyakinan: tafsir`.
7. **Topik**: pilih dari daftar `norma.topik` (himbauan, bukan kewajiban).

---

## 8. Cakupan (anti-omisi)

Isi `cakupan` untuk **setiap** pasal batang tubuh:

- `pasal_diekstrak`: pasal yang menghasilkan ≥1 norma/parameter/kategori/dll.
- `pasal_dilewati`: pasal yang ditinjau tetapi tidak menghasilkan norma, dengan `alasan`.
- `lengkap: true` bila seluruh batang tubuh sudah ditinjau; validator akan
  mengubah peringatan pasal yang tak tercatat menjadi **error**.

Validator membandingkan dengan heading `#### Pasal N` pada markdown, **memotong
di bagian PENJELASAN** (pasal di penjelasan bukan batang tubuh).

---

## 9. Amandemen

- Simpan **nilai yang berlaku saat ini** saja. Nilai yang sudah diubah **tidak**
  disimpan.
- Bila peraturan A diubah oleh B: `peraturan(A).status = "Diubah"` dan
  `peraturan(A).diubah_oleh = ["B"]`. B sendiri `status = "Berlaku"`.
- Bila nilai sebuah pasal berasal dari peraturan perubahan, catat `pasal` dan
  sumber norma pada record **peraturan perubahan** (B), bukan A.
- Rantai panjang: tautkan bertingkat (`A → B → C`), jangan datarkan asal-muasal.

---

## 10. Confidence & dasar keyakinan

Arti rentang ada di `data/skema_confidence.md`. Ringkas:

| Rentang | dasar_keyakinan | Arti |
|---|---|---|
| 0.90–1.00 | `dikutip` | diambil persis dari pasal |
| 0.70–0.89 | `tafsir` | butuh pemetaan/rujukan silang |
| 0.50–0.69 | `dinamis` | berubah menurut waktu/wilayah |
| 0.30–0.49 | `dinamis_berat` | sumber sekunder |
| 0.00–0.29 | `tidak dipakai` | meragukan |

`confidence` dan `dasar_keyakinan` adalah **metadata audit**, tidak masuk Turtle.

---

## 11. Prosedur untuk agen LLM

1. Baca `docs/markdown/<DOKUMEN_ID>.md`.
2. Kumpulkan seluruh heading `#### Pasal N` **sebelum** kata `PENJELASAN`.
3. Untuk tiap pasal: klasifikasikan (norma / dilewati / tidak termodelkan).
4. Tulis norma + parameter + tabel sesuai bagian 5–7.
5. Lengkapi `cakupan` (bagian 8).
6. Tulis file `data/extraction/records/<DOKUMEN_ID>.json`, `status_review: "draft"`.
7. Jalankan `scripts/validate_extraction.py --only <DOKUMEN_ID>` dan perbaiki sampai bersih.
8. Setelah ditinjau manusia, ubah `status_review` menjadi `"reviewed"`.

---

## 12. Checklist mandiri

- [ ] `spec_version`/`vocab_version` terisi.
- [ ] Semua `jenis`, `nama` parameter, enum lain ada di `VOCAB.yaml`.
- [ ] Setiap norma punya `bukti` dan `pasal`.
- [ ] Tidak ada `norm_id`/`iri_individu` duplikat.
- [ ] `confidence` ∈ [0,1]; `min_bulan ≤ max_bulan`; `jam_min ≤ jam_max`.
- [ ] `cakupan` mencakup seluruh pasal batang tubuh (bila `lengkap: true`).
- [ ] Angka ditulis sebagai string tanpa pemisah ribuan.
- [ ] Nilai amandemen yang lama tidak disimpan (bagian 9).

---

## 13. Contoh acuan

`data/extraction/records/PP-35-2021.json` — contoh struktural yang diretrifit
dari data pilot. **Bukan** hasil review hukum penuh; akan digantikan pada Fase 2.
Gunakan sebagai acuan bentuk, bukan acuan isi.

`data/extraction/records/PP-37-2021.json` — contoh dokumen baru end-to-end
(markdown → record → compile) sekaligus pola penanganan program non-pengusaha
(JKP) dan `tidak_termodelkan`.

---

## 14. Reproduksibilitas

- Versi spec & vocab tercatat di setiap record.
- Isi deterministik ada di record yang sudah di-commit; compiler dapat
  menjalankan ulang menghasilkan CSV yang identik.
- Perubahan spec/vocab wajib menaikkan versi dan dicatat di `VOCAB.yaml` `riwayat`.
- Jalankan `compile` **dua kali** dan pastikan tidak ada perubahan (`git diff` bersih)
  untuk membuktikan determinisme.

---

## 15. Pelajaran Fase 2/3 (kualitas markdown & sumber)

Bagian ini merangkum temuan nyata saat memperluas KB dari 12 dokumen pilot ke
seluruh UU/PP. Ia melengkapi bagian 8 (cakupan) dan 13 (contoh acuan).

### 15.1 Kualitas markdown (`docs/markdown/`)

Markdown dihasilkan `scripts/extract_text.py` (pymupdf4llm + OCR). Cacat yang
ditemukan dan penanganannya:

- **Bagian `PENJELASAN` mengulang seluruh pasal.** Heading pasal jadi ganda
  (mis. `pp-36-2021` sempat 171 heading vs ~86 pasal batang tubuh).
  `extract_text.py` kini **memotong** mulai baris `PENJELASAN`; frontmatter
  menandai `penjelasan_dipotong: true`.
- **OCR merusak heading pasal.** Contoh: `# Pasal29` (tanpa spasi),
  `# Pasal4T` (47 terbaca 4T), `Pasal3...`. Parser (`extraction_common.pasal_ref`,
  `body_pasal(loose=True)`) toleran terhadap variasi ini.
- **OCR buruk pada PDF scan** (mis. `pp-34-2021`): hanya sebagian pasal
  tertangkap, angka bisa salah baca (`(21` untuk `(2)`, `O,75` untuk `0,75`).

Aturan bagi LLM:

1. Baca **hanya batang tubuh** (sebelum `PENJELASAN`).
2. Bila markdown tidak lengkap/cacat OCR: **jangan menebak**. Isi
   `cakupan.lengkap: false`, catat penyebab di `cakupan.catatan`, dan tambahkan
   pasal bermasalah ke `tidak_termodelkan`.
3. Untuk nilai dari markdown cacat, turunkan `confidence` dan/atau tandai
   `catatan` bahwa sumber perlu diekstrak ulang.

### 15.2 Cakupan vs kenyataan

- `cakupan.lengkap: true` hanya bila **seluruh** pasal batang tubuh benar-benar
  ditinjau. Selama masih ada pasal `pasal_dilewati` "belum ditinjau", biarkan
  `false`.
- Record hasil retrofit/eksperimen **wajib** `lengkap: false` + catatan, meski
  lolos validator (validator hanya memberi peringatan).
- Rujukan pasal tanpa heading di markdown → **peringatan**, bukan error
  (indikasi gap/OCR markdown, bukan kesalahan record).

### 15.3 Program jaminan sosial non-pengusaha/pekerja

Model `program_jamsos` hanya menampung `tarif_pengusaha_persen` dan
`tarif_pekerja_persen`. Sebagian program (mis. **JKP**, PP 37/2021) dibiayai
Pemerintah Pusat + rekomposisi iuran JKK/JKM. Untuk kasus ini:

- Tetap catat baris `program_jamsos` dengan total tarif yang benar.
- Set `tarif_pengusaha_persen`/`tarif_pekerja_persen` = 0.
- Jelaskan sumber sebenarnya di `catatan` dan `tidak_termodelkan`.

### 15.4 Pertumbuhan kosakata (pola aditif)

`VOCAB.yaml` tumbuh aditif, tiap perubahan menaikkan versi + `riwayat`:

| Versi | Tambahan | Pemicu |
|---|---|---|
| 0.1.0 | seed (12 dokumen) | pilot awal |
| 0.2.0 | program `JKP` | PP 37/2021 |
| 0.3.0 | jenis `KetentuanTKA`, topik `TKA` | PP 34/2021 |

Menambah `norma.jenis` biasanya menuntut kelas baru di
`ontology/core/tbox-core.ttl` (mis. `ktn:KetentuanTKA`). Tambahkan keduanya
bersamaan agar `build_ontology.py` menerima record.

### 15.5 Sumber dokumen

- `docs/sources.yaml` adalah manifest 59 UU/PP (Fase 3: 61 entri setelah UU
  "jo." dipisah).
- Sumber bisa dari **BPK** (`peraturan.bpk.go.id`) atau **peraturan.go.id**
  (UU lama sering tidak ada Detail di BPK). `download_laws.py` me-resolusi PDF
  dari halaman mana pun; entri tanpa URL **di-skip** (bukan gagal).
- **UU "jo." dipisah** menjadi entri tersendiri (mis. `UU-12-2011` + `UU-13-2022`)
  dengan relasi di `catatan`, bukan satu entri gabungan.
- `docs/downloads.lock.json` memakai kunci `dokumen_id` **UPPERCASE** dan unik.

### 15.6 Performa ekstraksi

- OCR (`rapidocr-onnxruntime`, CPU) adalah **tahap paling lambat**; PDF scan
  besar (UU 6/2023 ±85 MB) bisa sangat lama.
- `extract_text.py` mendukung `--no-ocr` (cepat, halaman tanpa teks
  dikosongkan), `--dpi` (default 300; turunkan untuk kecepatan), dan mencetak
  progres `[ocr] halaman N/M`.
- Re-ekstraksi massal dijalankan **manual oleh pengguna** per klaster dokumen,
  bukan bagian dari pipeline otomatis.

