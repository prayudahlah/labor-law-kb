# KB & Reasoning Hukum Ketenagakerjaan Indonesia

Prototype knowledge base dan penalaran hak ketenagakerjaan Indonesia berbasis
OWL 2 DL (SROIQ(D)). Fakta norma dikurasi di CSV, digenerate menjadi Turtle,
dinalar dengan reasoner OWL 2 DL, dan nominal (pesangon, lembur, kompensasi)
dihitung di backend Java.

> Prototype edukasi. Bukan nasihat hukum.

Ontology memakai konstruktor nominal (`owl:oneOf`) dan qualified cardinality
(`owl:qualifiedCardinality`), sehingga DL expressivity terukur **SROIQ(D)**
(periksa dengan `scripts/check_expressivity.py`).

## Struktur

```
data/            CSV kanonik (generated) + extraction/ (spec, vocab, record JSON) + query audit
docs/            daftar sumber, markdown hukum hasil ekstraksi, checksum PDF
ontology/        core (T-Box/R-Box manual), meta & regulasi (generated), examples
backend/         backend Java (Spring Boot)
backend-python/  arsip backend FastAPI lama
frontend/        React + Vite
scripts/         unduh, ekstraksi, validasi/kompilasi record, build, verifikasi, katalog
```

## Ekstraksi Terstruktur

Fakta hukum didahulukan sebagai **Extraction Record** (JSON) yang direview,
lalu dikompilasi deterministik menjadi CSV kanonik. LLM (markdown → JSON) tidak
menulis CSV langsung; lihat `data/extraction/SPEC.md`.

```
docs/markdown/<id>.md ──LLM──► data/extraction/records/<id>.json
    ──validate──► ──compile──► data/*.csv ──build──► ontology/**/*.ttl
```

- `data/extraction/VOCAB.yaml` — satu sumber kebenaran enum (dibaca validator,
  compiler, dan `build_ontology.py`).
- `data/extraction/SPEC.md` — aturan ekstraksi untuk model LLM.
- `data/extraction/schema/extraction.schema.json` — kontrak record.

## Prasyarat

Python 3.12 dan uv untuk pipeline build, Java 21 dan Maven untuk backend,
serta Docker untuk menjalankan full stack.

## Instalasi

```bash
uv sync
```

`uv sync` menyiapkan `.venv` sesuai `uv.lock` (termasuk grup dev: `pytest`, `jupyterlab`).

## Menjalankan

```bash
uv run python scripts/validate_extraction.py   # validasi record JSON
uv run python scripts/compile_extraction.py    # record JSON -> CSV kanonik
uv run python scripts/build_ontology.py        # CSV -> Turtle
uv run python scripts/check_expressivity.py    # cek DL expressivity SROIQ(D)
uv run python scripts/check_ontology.py        # HermiT + uji kasus
uv run python scripts/build_catalog.py         # katalog + top-level Protege
duckdb < data/queries.sql                      # audit CSV
uv run jupyter lab                             # notebook eksplorasi
```

Backend Java:

```bash
cd backend
KB_ONTOLOGY_DIR=../ontology KB_DATA_DIR=../data mvn spring-boot:run
```

Atau full stack:

```bash
docker compose up --build
```

## Buka di Protege

1. Jalankan sekali:

   ```bash
   uv run python scripts/build_ontology.py
   uv run python scripts/build_catalog.py
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
Untuk SPARQL, pakai `rdflib` atau backend Java.

## Kosakata Eksternal

Ontology memakai **alignment** ke kosakata standar (bukan import penuh), agar
reasoning tetap offline. Deklarasi stub ada di `ontology/core/external.ttl`;
tidak ada `owl:imports` eksternal. Semua IRI di bawah sudah diverifikasi pada
**2026-11-09** terhadap dokumen resminya.

| Kosakata | Namespace | Sumber resmi | Term yang dipakai |
| --- | --- | --- | --- |
| FOAF | `http://xmlns.com/foaf/0.1/` | https://xmlns.com/foaf/spec/ | `foaf:Agent`, `foaf:Person`, `foaf:Organization` |
| ELI | `http://data.europa.eu/eli/ontology#` | https://op.europa.eu/en/web/eu-vocabularies/eli | `eli:LegalResource`, `eli:amends`, `eli:amended_by` |
| Dublin Core Terms | `http://purl.org/dc/terms/` | https://www.dublincore.org/specifications/dublin-core/dcmi-terms/ | `dct:identifier`, `dct:source` |

Pemetaan:

| Kosakata | Pemetaan |
| --- | --- |
| FOAF | `ktn:SubjekHukum ⊑ foaf:Agent`; `ktn:Pekerja`, `ktn:AhliWaris ⊑ foaf:Person`; `ktn:PerusahaanAlihDaya ⊑ foaf:Organization` |
| ELI | `reg:Peraturan ⊑ eli:LegalResource`; `reg:mengubah ⊑ eli:amends`; `reg:diubahOleh ⊑ eli:amended_by` |
| Dublin Core | `reg:nomor ⊑ dct:identifier`; `reg:sumberUtama ⊑ dct:source` |

`reg:status`, `reg:jenis`, dan `reg:tahun` sengaja tidak dialignment ke ELI
karena semantics/range-nya tidak identik (`eli:in_force`, `eli:type_document`,
`eli:date_document`).

Verifikasi ulang:

```bash
uv run python scripts/check_external_vocab.py --online
```

## Sumber Data

PDF dari JDIH BPK (`peraturan.bpk.go.id`). Daftar dan URL di
`docs/sources.yaml`; checksum di `docs/downloads.lock.json`; teks hasil
ekstraksi di `docs/markdown/`.

## Metadata

Turtle hanya memuat metadata bermakna (`ktn:pasal`, `dct:source`). Arti
`confidence` dan `dasar_keyakinan` ada di `data/skema_confidence.md`.

## Lisensi

Lihat `LICENSE`.
