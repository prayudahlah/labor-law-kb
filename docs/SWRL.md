# SWRL Kalkulasi — Ringkasan untuk Review

Dokumen ini merangkum pekerjaan SWRL untuk KB & Reasoning Hukum
Ketenagakerjaan, supaya bisa dicek kesesuaiannya dengan desain KB yang
dipegang tim. Fokusnya: **apa yang sudah dibuat**, **bagaimana membuktikannya**,
dan **apa yang perlu dikonfirmasi**.

- Branch: `feat/swrl`, plus perbaikan UPMK < 36 bulan di `fix/phk-upmk-36`
- Commit awal: `coba swrl`
- Reasoner: **Openllet 2.6.5** (fork Pellet)
- Status: 29 rule, 21 tes SWRL, 93 tes backend hijau (default `auto`; `swrl` untuk demo, `java` legacy)

> Catatan: dokumen ini bukan nasihat hukum. Semua nilai mengacu pada CSV kanonik
> di `data/` dan regulasi yang sudah diekstrak.

## 1. Ringkasan

SWRL dipakai untuk menghitung nominal hak dari fakta kasus. Backend menulis
ABox kasus, reasoner menjalankan rule, lalu backend membaca data property hasil
hitung dan memetakannya ke response API.

Cakupan saat ini:

| Topik | Rule | Status |
|---|---:|---|
| PHK | 19 | penuh, termasuk UPMK 0 untuk masa kerja < 36 bulan |
| PKWT | 1 | penuh |
| Jamsos | 1 | penuh (JHT + JP) |
| KIA | 2 | penuh |
| Lembur | 5 | jam bulat; hari kerja 1..4, hari libur 1..12 |
| Cuti | 1 | cuti tahunan saja |
| **Total** | **29** | |

## 2. Peta berkas

| Berkas | Sifat | Isi |
|---|---|---|
| `ontology/core/swrl-kalkulasi.rdf` | **generated** | 29 rule SWRL (RDF/XML) |
| `scripts/build_swrl.py` | manual | generator rule dari `kategori.csv` + tabel lembur |
| `ontology/core/tbox-core.rdf` | manual | deklarasi properti output/antara dan marker class |
| `scripts/build_ontology.py` | manual | emit marker bracket terbuka + individu `AkumulasiLembur` |
| `scripts/build_catalog.py` | manual | impor modul SWRL ke `ontology.rdf` + katalog |
| `backend/.../kb/SwrlCalculationProvider.java` | manual | membaca output SWRL, menolak nilai ganda, membulatkan tampilan |
| `backend/.../SwrlKalkulasiTest.java` | manual | 21 tes end-to-end memakai Openllet |
| `scripts/check_ontology.py` | manual | cek T-Box dengan HermiT, flag `--tanpa-swrl` |
| `backend/KB_CONTRACT.md` | manual | kontrak input/output dan batasan |

Jangan edit `ontology/core/swrl-kalkulasi.rdf` langsung; ubah
`scripts/build_swrl.py` lalu regenerate.

## 3. Arsitektur: dua jalur

```
Request
  └─ ChatService (router kata kunci)
       ├─ RETRIEVAL — tanpa reasoner
       │    SparqlService memuat semua modul *.rdf ke satu model Jena
       │    → SPARQL ARQ → daftar pasal/norma
       │    (tidak melihat tripel hasil inferensi)
       │
       └─ INFERENSI — reasoner per kasus
            OntologyService memuat KB sekali (OWLAPI + katalog)
            → ReasonerService membuat ontology kasus + ABox (Forms)
            → CaseSession menjalankan Openllet/Pellet
              precompute CLASS_ASSERTIONS + DATA_PROPERTY_ASSERTIONS
            → rule SWRL menghasilkan nominal
            → SwrlCalculationProvider membaca hasil
```

| | Retrieval | Inferensi |
|---|---|---|
| Reasoner | tidak ada | Openllet (Pellet) |
| Bahasa | SPARQL | OWL DL + SWRL |
| Menjawab | "apa aturannya?" | "berapa hak saya?" |
| Melihat hasil SWRL? | tidak | ya |
| Contoh output | daftar pasal | `nominalPesangon` |

**Penting soal HermiT:** `scripts/check_ontology.py` memakai HermiT hanya untuk
konsistensi T-Box. HermiT tidak bisa mengeksekusi builtin `swrlb` (mis.
`multiply`), jadi skrip itu dijalankan dengan `--tanpa-swrl`. Perhitungan
**tidak pernah** memakai HermiT.

## 4. Rule per topik

| Topik | Jumlah | Input ABox | Output |
|---|---:|---|---|
| PHK | 9 UP + 9 UPMK + 1 nominal | `masaKerjaBulan`, `upahBulanan`, `mengalami`, `memilikiAlasanPHK`, `pengaliUP`, `pengaliUPMK` | `upDasar`, `upmkDasar`, `bulanUP`, `bulanUPMK`, `totalBulan`, `nominalPesangon` |
| PKWT | 1 | `masaKerjaBulan`, `upahBulanan`, `faktorPembagiKompensasi` | `kompensasiBulan`, `nominalKompensasiPKWT` |
| Jamsos | 1 | `upahBulanan`, tarif individu `JHT` + `JP` | `persenPekerja`, `persenPengusaha`, `iuranPekerja`, `iuranPengusaha` |
| KIA | 2 | `cutiMelahirkanBulan`, `upahBulanan`, `bulanUpahPenuh` | `totalBulanUpah`, `nominalUpahCutiMelahirkan` |
| Lembur | 5 | `jamLembur`, `padaHariKerja`, `upahBulanan` | `upahSejam`, `pengaliTotalLembur`, `nominalLembur` |
| Cuti | 1 | `MemenuhiSyaratCutiTahunan`, `CutiTahunan12Hari` | `cutiTahunanHari` |

Contoh rule PHK (bracket, kasus nol, lalu nominal, supaya tidak jadi 72 rule):

```
KategoriUP(?k) ∧ minBulan(?k,?lo) ∧ maxBulan(?k,?hi) ∧ upDasarBulan(?k,?d)
∧ Pekerja(?p) ∧ masaKerjaBulan(?p,?m)
∧ swrlb:greaterThanOrEqual(?m,?lo) ∧ swrlb:lessThan(?m,?hi)
→ upDasar(?p,?d)
```

```
Pekerja(?p) ∧ masaKerjaBulan(?p,?m) ∧ swrlb:lessThan(?m,36)
→ upmkDasar(?p,0)
```

```
Pekerja(?p) ∧ mengalami(?p,?phk) ∧ memilikiAlasanPHK(?phk,?a)
∧ pengaliUP(?a,?f1) ∧ pengaliUPMK(?a,?f2)
∧ upDasar(?p,?d1) ∧ upmkDasar(?p,?d2) ∧ upahBulanan(?p,?u)
∧ swrlb:multiply(?b1,?d1,?f1) ∧ swrlb:multiply(?b2,?d2,?f2)
∧ swrlb:add(?t,?b1,?b2) ∧ swrlb:multiply(?n,?t,?u)
→ bulanUP(?p,?b1) ∧ bulanUPMK(?p,?b2) ∧ totalBulan(?p,?t) ∧ nominalPesangon(?p,?n)
```

## 5. Nilai acuan

Semua nilai ini keluar dari SWRL (mode `swrl`, tanpa fallback Java).

| Kasus | Rincian | Nominal |
|---|---|---:|
| PHK 6 bln, upah 12 jt, `EfisiensiRugi` | UP 0,5 · UPMK 0 · total 0,5 | 6.000.000 |
| PHK 120 bln, upah 5 jt, `EfisiensiRugi` | UP 4,5 · UPMK 4,0 · total 8,5 | 42.500.000 |
| PKWT 24 bln | 2,0 bulan | 10.000.000 |
| Jamsos, upah 5 jt | 3% / 5,7% | 150.000 / 285.000 |
| KIA 6 bln | 5,5 bulan upah | 27.500.000 |
| Lembur 4 jam hari kerja | upah/jam 28.901,73 | 216.763 |
| Cuti 12 bln | 12 hari | – |

Edge case yang ikut diuji:

- PKWT 25 bulan → 2,0833… bulan (memastikan pembagian desimal, bukan integer).
- KIA 3 bulan (kurang dari 4) dan 4 bulan (tepat) → tanpa potongan.
- PHK 6 bulan (UPMK 0) dan 36 / 48 / 72 / 96 / 300 bulan, termasuk bracket terbuka.
- PHK `MengundurkanDiri` → 0.
- Lembur hari libur 8 / 9 / 12 jam.

## 6. Cara memverifikasi

Regenerate (setelah mengubah CSV):

Dari root repo:

```bash
uv run --no-project --with rdflib --with pyyaml python scripts/build_ontology.py
uv run --no-project --with rdflib --with pyyaml python scripts/build_swrl.py
uv run --no-project --with rdflib --with pyyaml python scripts/build_catalog.py
```

Tes SWRL (Docker, karena Maven lokal belum tentu ada):

```bash
docker run --rm -v "$PWD:/workspace" -v m2-cache:/root/.m2 -w /workspace/backend maven:3.9-eclipse-temurin-21 mvn -B test -Dtest=SwrlKalkulasiTest
```

Harapan: `Tests run: 15, Failures: 0`.

Seluruh suite, termasuk jalur API tanpa fallback Java:

```bash
docker run --rm -e KB_CALC_MODE=swrl -v "$PWD:/workspace" -v m2-cache:/root/.m2 -w /workspace/backend maven:3.9-eclipse-temurin-21 mvn -B test
```

Harapan: `Tests run: 93, Failures: 0`.

Cek T-Box dengan HermiT:

```bash
uv run --no-project --with rdflib --with owlready2 --with pyyaml python scripts/check_ontology.py --tanpa-swrl
```

Tanpa `--tanpa-swrl`, HermiT akan gagal dengan pesan yang sekarang sudah
menjelaskan agar memakai flag tersebut.

## 7. Keputusan desain

1. **Bracket terbuka** (`UP-96-INF`, `UPMK-288-INF`) memakai marker class
   `KategoriUPTerbuka` / `KategoriUPMKTerbuka`, bukan `maxBulan` sentinel.
   Alasannya: SWRL tidak punya negasi untuk menyatakan "tidak ada batas".
2. **Lembur progresif** memakai tabel `AkumulasiLembur` yang dihasilkan saat
   build dari `pengali_lembur.csv`. SWRL tidak punya agregasi, jadi total
   pengali untuk 1..n jam tidak mungkin dihitung langsung di rule.
3. **`nominalPesangon`** = (UP + UPMK) × upah bulanan.
4. **`hak`** tetap dari class assertion hasil reasoning, bukan dari SWRL.
5. **Cuti** hanya menghasilkan `cutiTahunanHari`; `hariDibayar` untuk peristiwa
   cuti khusus tetap dibaca Java dari individu peristiwa.
6. **Pembulatan** dilakukan backend: `upah_sejam` 2 desimal, nominal lembur
   0 desimal. SWRL sendiri tidak bisa membulatkan.
7. **Nilai ganda** dari duplikasi bracket PP-35-2021 vs UU-13-2003 ditolak
   provider kalau berbeda; saat ini nilainya identik sehingga aman.
8. **Mode default `auto`**; `swrl` dipakai untuk demo yang ingin membuktikan
   jalur rule tanpa fallback. `java` tetap legacy.
9. **Format RDF/XML SWRL** wajib memakai `swrl:DatavaluedPropertyAtom` dan
   body/head bertipe `swrl:AtomList`. Versi awal memakai
   `swrl:DatatypePropertyAtom` + `parseType="Collection"` dan OWLAPI
   mem-parse rule dengan body/head kosong tanpa error — ini jebakan yang
   sudah diperbaiki.

## 8. Batasan yang diketahui

- SWRL tidak punya agregasi, negasi, rekursi, atau pembulatan.
- Batas legal lembur 4 jam per hari untuk hari kerja. SWRL mencakup hari
  kerja 1..4 dan hari libur 1..12. Jam pecahan gagal di mode `swrl`; mode
  `auto` fallback ke Java, yang menghitung pecahan secara proporsional.
- `padaHariKerja=false` dipetakan ke `libur_5hari`. Libur 6 hari dan libur
  terpendek dapat dipilih lewat `jenisHari`; backend menulis
  `jenisHariLembur` langsung.
- Jamsos hanya JHT + JP (bukan JKK/JKM/JKP), sama seperti provider Java.
- Cuti khusus (haid, keguguran, menikah) belum masuk SWRL. Backend
  mengembalikan kosong kalau cuti khusus tidak lengkap, sehingga mode `auto`
  fallback ke Java. Setelah rule `cutiKhususHari` masuk, jalur SWRL dapat
  mengisi `hari_dibayar`.
- Hasil SWRL hanya terlihat oleh reasoner, tidak muncul di SPARQL/Jalur
  retrieval.
- Openllet menulis log INFO `Non numeric arguments ... anon(1)` saat join
  builtin. Itu noise internal; hasil inferensi tetap benar.

### Pekerjaan lanjutan untuk SWRL

Daftar ini untuk area rule/ontology, bukan backend Java:

1. **Lembur pecahan.** SWRL tetap untuk jam bulat. Jam pecahan ditangani
   fallback Java di mode `auto`. Tidak perlu rule baru kecuali targetnya
   SWRL-only untuk pecahan.
2. **Cuti khusus.** Tambah output khusus di `Pekerja` (`cutiKhususHari`) dan
   rule dari `mengalamiPeristiwa`. Backend sudah memetakan input ke
   `UpahCuti*` dan mengembalikan kosong kalau data khusus belum ada, sehingga
   `auto` fallback ke Java. Jangan menyalin `hariDibayar` langsung ke
   `Pekerja`, karena domain properti itu `PeristiwaCutiKhusus`.
3. **Cuti keguguran.** SWRL belum menghasilkan `cuti_haid_hari`; buat issue
   terpisah karena durasinya 1,5 bulan, bukan 2 hari.
4. **Libur 6 hari dan libur terpendek.** Backend sudah menambah `jenisHari`
   dan menulis `jenisHariLembur` langsung. Vio cukup memastikan
   `AkumulasiLembur` untuk kedua jenis hari ada; tidak perlu rule baru.
5. **Jamsos.** Scope tetap JHT + JP. JKK/JKM/JKP di luar iterasi ini.

## 9. Checklist review

Isi kolom "Sesuai?" dengan ✓/✗ dan tulis catatan bila ada yang perlu diubah.

| # | Yang dicek | Sesuai? | Catatan |
|---|---|---|---|
| 1 | Nama properti output (`bulanUP`, `nominalPesangon`, `upahSejam`, dst.) | ☐ | |
| 2 | Tipe data: nominal/bulan `xsd:decimal`, `upDasar`/`cutiTahunanHari` `xsd:integer` | ☐ | |
| 3 | Nilai bracket UP: 1..9 bulan dan UPMK: 0 untuk < 36 bulan, lalu 2..10 bulan | ☐ | |
| 4 | Pengali per alasan PHK (`EfisiensiRugi` 0,5/1; `MengundurkanDiri` 0/0; dst.) | ☐ | |
| 5 | Rumus `nominalPesangon` = total UP + UPMK × upah | ☐ | |
| 6 | Lembur memakai tabel akumulatif; hari kerja 1..4, libur 1..12 | ☐ | |
| 7 | `padaHariKerja=false` dianggap `libur_5hari` | ☐ | |
| 8 | Jamsos hanya JHT + JP | ☐ | |
| 9 | KIA: 4 bulan upah penuh, sisa 75% | ☐ | |
| 10 | Cuti khusus sengaja tetap di Java | ☐ | |
| 11 | Default mode `auto`; `swrl` untuk demo, `java` legacy | ☐ | |
| 12 | Duplikasi bracket PP-35 vs UU-13 dianggap aman | ☐ | |

## 10. Pertanyaan terbuka

1. Apakah perlu input `jenisHari` agar libur 6 hari dan libur terpendek bisa
   dihitung?
2. Apakah cuti khusus (haid/keguguran/menikah) mau dipindah ke SWRL, atau tetap
   di Java?
3. Apakah perlu memilih versi peraturan secara eksplisit kalau nanti nilai
   bracket PP-35 dan UU-13 berbeda?
4. Apakah Jamsos cukup JHT + JP, atau perlu JKK/JKM/JKP juga?
5. Apakah `nominalPesangon` memang harus total UP + UPMK, bukan UP saja?

## 11. Status git

- Branch: `feat/swrl`
- Commit awal: `coba swrl`
- Status: sudah di-push. PR #11 (UPMK < 36 bulan) dan PR #12 (fallback Java,
  default `auto`) sudah merged.
- Perbaikan batas lembur 4 jam, pemetaan cuti, dan `jenisHari` ada di branch
  `fix/backend-followups`.

Setelah itu buka PR `feat/swrl` -> `dev` dan pastikan CI hijau (test backend,
test mode SWRL, cek drift generated files, build frontend, build image).
