# CHEAT-SHEET EKSTRAKSI (untuk subagent LLM)

Ringkasan kerja. Sumber aturan lengkap: `data/extraction/SPEC.md`.
Kosakata nilai terkontrol: `data/extraction/VOCAB.yaml` (WAJIB dibaca).

## Tugas
Baca SATU file packet (`chunk-*.md`), lalu tulis SATU fragmen JSON ke path
yang ditentukan di header packet. Jangan menyentuh file lain.

## Keluaran: fragmen JSON
```json
{
  "dokumen_id": "PP-35-2021",
  "chunk": 1,
  "norma": [
    {
      "norm_id": "PHK-EFISIENSI-RUGI",
      "topik": "PHK",
      "pasal": "Pasal 43 ayat (1)",
      "iri_individu": "ktn:EfisiensiRugi",
      "jenis": "AlasanPHK",
      "kondisi": "Efisiensi karena perusahaan mengalami kerugian",
      "akibat": "Pekerja berhak UP 0,5x + UPMK 1x + UPH",
      "parameter": [
        {"nama": "pengaliUP", "nilai": "0.5", "satuan": "kali",
         "jenis": "pengali", "pasal": "Pasal 43 ayat (1)"}
      ],
      "bukti": "uang pesangon sebesar 0,5 (nol koma lima) kali ketentuan Pasal 40 ayat (2)",
      "confidence": 0.95,
      "dasar_keyakinan": "dikutip",
      "catatan": ""
    }
  ],
  "kategori": [],
  "pengali_lembur": [],
  "program_jamsos": [],
  "pasal_diekstrak": ["Pasal 43"],
  "pasal_dilewati": [{"pasal": "Pasal 1", "alasan": "definisi/istilah"}],
  "tidak_termodelkan": [
    {"pasal": "Pasal 44", "ringkasan": "...", "alasan": "butuh kelas/properti baru"}
  ]
}
```

Aturan fragmen:
- Semua nilai enum HARUS ada di `VOCAB.yaml`. Jangan mengarang.
- `norma[].bukti` wajib: kutipan pendek verbatim (maks ~200 karakter), bukan parafrase.
- Angka sebagai string, desimal pakai titik, tanpa pemisah ribuan.
- `confidence` 0.0–1.0; `dasar_keyakinan` dari VOCAB.
- Hanya tulis bagian yang relevan; array kosong boleh.
- JSON ringkas (boleh satu baris), valid, tanpa teks lain di file.

## Klasifikasi setiap pasal di packet
Setiap label `#### Pasal N` di packet WAJIB masuk salah satu:
1. `pasal_diekstrak` — menghasilkan ≥1 norma/kategori/pengali/program.
2. `pasal_dilewati` — ditinjau, tidak menghasilkan norma, beri `alasan`
   (mis. "definisi", "sanksi administratif", "ketentuan peralihan").
3. `tidak_termodelkan` — relevan tetapi butuh kelas/properti yang belum ada.

Jangan mengosongkan pasal tanpa alasan. Cakupan lengkap = syarat record dipakai.

## Kapan membuat norma
Buat norma hanya bila ada **kondisi/subjek → akibat hukum** yang bisa dinalar.
Bukan norma: definisi, tata cara internal, kelembagaan, sanksi, peralihan,
penutup, pidana → `pasal_dilewati`.

## Granularitas
Satu norma per ayat/sub-ayat dengan akibat berbeda. Ayat dengan akibat identik
boleh digabung (sebut di `catatan`).

## Penamaan
- `norm_id`: HURUF BESAR dipisah `-`, diawali kluster topik
  (mis. `PHK-`, `LEMBUR-`, `PKWT-`, `JAMSOS-`, `KIA-`, `TKA-`).
- `iri_individu`: `ktn:` + PascalCase, unik (mis. `ktn:EfisiensiRugi`).
- `pasal`: tulis seperti sumber (`Pasal 43 ayat (1)`, `Pasal 93 ayat (4)a`).
- `topik`: pilih dari `VOCAB.norma.topik`.

## Jebakan
- OCR: `Pasal29`, `Pasal4T`, `(21` untuk `(2)`, `O,75` untuk `0,75`.
  Gunakan konteks; turunkan `confidence` bila ragu.
- Omnibus: pasal bisa tidak berurutan dan dari UU berbeda.
- Amandemen: hanya nilai yang berlaku saat ini; jangan simpan nilai lama.
- Dokumen di luar domain T-Box: jangan paksakan; pakai
  `tidak_termodelkan`/`pasal_dilewati`. Tidak masalah bila norma = 0.

## Selesai
Tulis fragmen, lalu balas SATU baris:
`OK <dokumen_id> chunk <n>: <jumlah norma> norma, <jumlah dilewati> dilewati`.
Bila gagal: `GAGAL <dokumen_id> chunk <n>: <alasan singkat>`.
