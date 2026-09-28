# KB & Reasoning Hukum Ketenagakerjaan Indonesia

Prototype knowledge base dan penalaran hak ketenagakerjaan Indonesia berbasis
OWL 2 DL (SROIQ(D)). Fakta norma dikurasi di CSV, digenerate menjadi Turtle,
dinalar dengan HermiT, dan nominal (pesangon, lembur, kompensasi) dihitung
dengan Python.

> Prototype edukasi. Bukan nasihat hukum.

## Struktur

```
data/        CSV kanonik (norma, parameter, kategori, jamsos) + query audit
docs/        daftar sumber, markdown hukum hasil ekstraksi, checksum PDF
ontology/    core (T-Box/R-Box manual), meta & regulasi (generated), examples
notebooks/   eksplorasi DL query & SPARQL
scripts/     unduh, ekstraksi, build, verifikasi, katalog
```

## Prasyarat

Python 3.12, Java 17 (untuk HermiT via owlready2), dan uv.

## Instalasi

```bash
uv venv --python 3.12
uv pip sync requirements.txt
```

Notebook (opsional, di luar lock): `uv pip install jupyterlab ipykernel`.

## Menjalankan

```bash
.venv/bin/python scripts/build_ontology.py     # CSV -> Turtle
.venv/bin/python scripts/check_ontology.py     # HermiT + uji kasus
.venv/bin/python scripts/build_catalog.py      # katalog + top-level Protege
duckdb < data/queries.sql                      # audit CSV
.venv/bin/jupyter lab                          # notebook eksplorasi
```

## Buka di Protege

1. Jalankan sekali:

   ```bash
   .venv/bin/python scripts/build_ontology.py
   .venv/bin/python scripts/build_catalog.py
   ```

2. Buka **Protege** (5.5+), lalu **File > Open** dan pilih
   `ontology/ontology.ttl`.
3. Import diselesaikan otomatis lewat `ontology/catalog-v001.xml`
   (pastikan kedua berkas tetap di folder `ontology/`).
4. Jalankan **Reasoner > HermiT > Start reasoner**.
5. Lihat hasil di tab **Entities** / **Individuals**, atau tanyakan di
   tab **DL Query**, mis.:
   - `MemenuhiSyaratPesangon` (centang *Instances*)
   - `PekerjaPKWT` atau `Pekerja and (masaKerjaBulan some xsd:integer[>= 12])`

Catatan: tab **SPARQL** bawaan Protege kadang gagal karena bundle Guava.
Untuk SPARQL, pakai `notebooks/eksplorasi_kb.ipynb` atau `rdflib`.

## Sumber Data

PDF dari JDIH BPK (`peraturan.bpk.go.id`). Daftar dan URL di
`docs/sources.yaml`; checksum di `docs/downloads.lock.json`; teks hasil
ekstraksi di `docs/markdown/`.

## Metadata

Turtle hanya memuat metadata bermakna (`ktn:pasal`, `dct:source`). Arti
`confidence` dan `dasar_keyakinan` ada di `data/skema_confidence.md`.

## Lisensi

Lihat `LICENSE`.
