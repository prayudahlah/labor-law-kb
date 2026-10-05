#!/usr/bin/env python3
"""Bangun modul Turtle A-Box dari CSV kanonik di data/.

Alur:
  data/regulasi.csv   -> ontology/meta/regulasi.ttl        (individu peraturan + amandemen)
  data/norma.csv      -> ontology/regulasi/<dokumen>.ttl   (individu norma)
  data/parameter.csv       (dilampirkan ke individu norma)
  data/kategori.csv        (individu kategori UP/UPMK)

Sifat:
  - deterministik: keluaran diurutkan, menjalankan ulang menghasilkan berkas identik
  - memvalidasi semua rujukan sebelum menulis; build gagal bila ada pelanggaran
  - hasil ditandai "JANGAN EDIT MANUAL"

Jalankan: uv run python scripts/build_ontology.py
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ONTO = ROOT / "ontology"

REQUIRED_FILES = ["regulasi.csv", "norma.csv", "parameter.csv", "kategori.csv"]

HEADER = """# =====================================================================
# BERKAS DIGENERATE. JANGAN EDIT MANUAL.
# Sumber   : data/{sumber}
# Hasilkan : uv run python scripts/build_ontology.py
# =====================================================================
"""

PREFIXES = """@prefix ktn:  <https://example.org/kbr/ketenagakerjaan#> .
@prefix reg:  <https://example.org/kbr/regulasi#> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
"""

JENIS_PERATURAN = {"UU": "reg:UndangUndang", "PP": "reg:PeraturanPemerintah"}
STATUS = {"Berlaku": "reg:Berlaku", "Diubah": "reg:Diubah", "Dicabut": "reg:Dicabut"}
NAMA_TABEL_KELAS = {"uang_pesangon": "ktn:KategoriUP", "upmk": "ktn:KategoriUPMK"}
ALLOWED_JENIS = {
    "AlasanPHK",
    "PeristiwaCutiKhusus",
    "KetentuanWaktuKerja",
    "KetentuanUpah",
    "KetentuanLembur",
    "KetentuanPKWT",
    "KetentuanAlihDaya",
    "KetentuanJaminanSosial",
    "KetentuanKIA",
}
ALLOWED_PARAM = {
    "pengaliUP",
    "pengaliUPMK",
    "hariDibayar",
    "jamKerjaPerHari",
    "jamKerjaPerMinggu",
    "jumlahHariKerjaPerMinggu",
    "istirahatMingguanHari",
    "jamLemburMaksPerHari",
    "jamLemburMaksPerMinggu",
    "faktorPembagiUpahSejam",
    "pengaliKonversiHarian6",
    "pengaliKonversiHarian5",
    "kebutuhanKalori",
    "batasTahunPKWT",
    "batasHariKerjaHarian",
    "batasBulanKonversi",
    "faktorPembagiKompensasi",
    "batasHariPencatatan",
    "usiaPensiunTahun",
    "cutiMelahirkanBulanMin",
    "cutiMelahirkanBulanMax",
    "bulanUpahPenuh",
    "bulanUpah75",
    "cutiKeguguranBulan",
    "cutiPendampinganHari",
    "cutiPendampinganTambahanHari",
}
JENIS_HARI_VALID = {"hari_kerja", "libur_6hari", "libur_terpendek", "libur_5hari"}
ALLOWED_PROGRAM_JAMSOS = {"JKK", "JKM", "JHT", "JP"}
ALLOWED_DASAR = {"dikutip", "tafsir", "dinamis", "tidak_lengkap"}


def baca_csv(nama: str) -> list[dict[str, str]]:
    path = DATA / nama
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def ttl_str(teks: str) -> str:
    return '"' + teks.replace("\\", "\\\\").replace('"', '\\"') + '"'


def angka(teks: str) -> str:
    """Format nilai numerik agar rapi dan konsisten."""
    f = float(teks)
    if f.is_integer():
        return str(int(f))
    return repr(f)


def validasi(regulasi, norma, parameter, kategori, pengali_lembur, program_jamsos) -> list[str]:
    err: list[str] = []
    dokumen_ids = {r["dokumen_id"] for r in regulasi}

    if len(dokumen_ids) != len(regulasi):
        err.append("regulasi.csv: dokumen_id duplikat")

    norm_ids = [n["norm_id"] for n in norma]
    if len(set(norm_ids)) != len(norm_ids):
        err.append("norma.csv: norm_id duplikat")

    for n in norma:
        if n["dokumen_id"] not in dokumen_ids:
            err.append(f"norma {n['norm_id']}: dokumen_id tidak dikenal")
        if not n["iri_individu"].startswith("ktn:"):
            err.append(f"norma {n['norm_id']}: iri_individu harus berprefix ktn:")
        if n["jenis"] not in ALLOWED_JENIS:
            err.append(f"norma {n['norm_id']}: jenis '{n['jenis']}' belum didukung")
        c = float(n["confidence"])
        if not 0.0 <= c <= 1.0:
            err.append(f"norma {n['norm_id']}: confidence di luar rentang")

    norm_id_set = set(norm_ids)
    for p in parameter:
        if p["norm_id"] not in norm_id_set:
            err.append(f"parameter {p['norm_id']}: norm_id tidak ada di norma.csv")
        if p["nama"] not in ALLOWED_PARAM:
            err.append(f"parameter {p['norm_id']}: nama '{p['nama']}' tidak dikenal")
        float(p["nilai"])

    for r in regulasi:
        if r["jenis"] not in JENIS_PERATURAN:
            err.append(f"regulasi {r['dokumen_id']}: jenis tidak dikenal")
        if r["status"] not in STATUS:
            err.append(f"regulasi {r['dokumen_id']}: status tidak dikenal")

    for k in kategori:
        if k["dokumen_id"] not in dokumen_ids:
            err.append(f"kategori {k['tabel_id']}: dokumen_id tidak dikenal")
        if k["nama_tabel"] not in NAMA_TABEL_KELAS:
            err.append(f"kategori {k['tabel_id']}: nama_tabel tidak dikenal")
        int(k["min_bulan"])
        int(k["nilai_bulan"])
        if k["max_bulan"]:
            int(k["max_bulan"])

    for pl in pengali_lembur:
        if pl["dokumen_id"] not in dokumen_ids:
            err.append(f"pengali_lembur {pl['tabel_id']}: dokumen_id tidak dikenal")
        if pl["jenis_hari"] not in JENIS_HARI_VALID:
            err.append(f"pengali_lembur {pl['tabel_id']}: jenis_hari tidak dikenal")
        jmin, jmax = int(pl["jam_min"]), int(pl["jam_max"])
        if jmin > jmax:
            err.append(f"pengali_lembur {pl['tabel_id']}: jam_min > jam_max")
        float(pl["pengali"])

    for pj in program_jamsos:
        if pj["dokumen_id"] not in dokumen_ids:
            err.append(f"program_jamsos {pj['program_id']}: dokumen_id tidak dikenal")
        if pj["jenis_program"] not in ALLOWED_PROGRAM_JAMSOS:
            err.append(f"program_jamsos {pj['program_id']}: jenis_program tidak dikenal")
        float(pj["tarif_pengusaha_persen"])
        float(pj["tarif_pekerja_persen"])
        float(pj["tarif_total_persen"])

    for tabel, rows in [
        ("norma", norma), ("parameter", parameter), ("kategori", kategori),
        ("pengali_lembur", pengali_lembur), ("program_jamsos", program_jamsos),
    ]:
        for r in rows:
            d = r.get("dasar_keyakinan", "")
            if d and d not in ALLOWED_DASAR:
                err.append(f"{tabel}: dasar_keyakinan '{d}' tidak dikenal")
            if r.get("confidence"):
                float(r["confidence"])

    return err


def emit_meta(regulasi: list[dict]) -> str:
    blok = [
        f'{HEADER.format(sumber="regulasi.csv")}',
        PREFIXES,
        '<https://example.org/kbr/regulasi> a owl:Ontology ;',
        '    dct:title "Metadata peraturan ketenagakerjaan (individu)" ;',
        '    owl:imports <https://example.org/kbr/regulasi/vocab> .',
        "",
    ]
    for r in sorted(regulasi, key=lambda x: x["dokumen_id"]):
        individu = f'reg:{r["dokumen_id"]}'
        baris = [
            f"{individu} a reg:Peraturan ;",
            f'    dct:title {ttl_str(r["judul"])} ;',
            f'    reg:jenis {JENIS_PERATURAN[r["jenis"]]} ;',
            f'    reg:nomor {ttl_str(r["nomor"])} ;',
            f'    reg:tahun "{r["tahun"]}"^^xsd:gYear ;',
            f'    reg:status {STATUS[r["status"]]} ;',
            f'    reg:sumberUtama <{r["sumber"]}>',
        ]
        if r.get("diubah_oleh"):
            baris[-1] += " ;"
            baris.append(f'    reg:diubahOleh reg:{r["diubah_oleh"]}')
        baris[-1] += " ."
        blok.extend(baris)
        blok.append("")
    return "\n".join(blok).rstrip() + "\n"


def emit_topik(topik_list: list[str]) -> str:
    blok = [
        f'{HEADER.format(sumber="norma.csv (kolom topik)")}',
        PREFIXES,
        '<https://example.org/kbr/ketenagakerjaan/meta/topik> a owl:Ontology ;',
        '    dct:title "Topik hukum (untuk retrieval)" ;',
        '    owl:imports <https://example.org/kbr/ketenagakerjaan> .',
        "",
    ]
    for t in sorted(topik_list):
        blok.append(f"ktn:Topik{t} a owl:NamedIndividual, ktn:Topik ;")
        blok.append(f'    rdfs:label {ttl_str(t)} .')
        blok.append("")
    return "\n".join(blok).rstrip() + "\n"


def emit_modul(dokumen_id, regulasi_row, norma, parameter, kategori, pengali_lembur, program_jamsos) -> str:
    slug = dokumen_id.lower()
    sumber = "norma.csv, parameter.csv, kategori.csv, pengali_lembur.csv, program_jamsos.csv"
    onto_iri = f"https://example.org/kbr/ketenagakerjaan/regulasi/{slug}"
    blok = [
        f"{HEADER.format(sumber=sumber)}",
        PREFIXES,
        f"<{onto_iri}> a owl:Ontology ;",
        f'    dct:title "Fakta norma: {regulasi_row["judul"]}" ;',
        f'    dct:source <{regulasi_row["sumber"]}> ;',
        "    owl:imports <https://example.org/kbr/ketenagakerjaan> .",
        "",
    ]

    param_per_norm: dict[str, list[dict]] = {}
    for p in parameter:
        param_per_norm.setdefault(p["norm_id"], []).append(p)

    for n in sorted(norma, key=lambda x: x["norm_id"]):
        params = sorted(param_per_norm.get(n["norm_id"], []), key=lambda x: x["nama"])
        lines = [
            f'{n["iri_individu"]} a owl:NamedIndividual, ktn:{n["jenis"]} ;',
        ]
        for p in params:
            lines.append(f'    ktn:{p["nama"]} {angka(p["nilai"])} ;')
        lines.append(f'    ktn:pasal {ttl_str(n["pasal"])} ;')
        lines.append(f'    ktn:berkaitanTopik ktn:Topik{n["topik"]} ;')
        lines.append(f"    dct:source reg:{n['dokumen_id']} .")
        blok.extend(lines)
        blok.append("")

    kat_dok = [k for k in kategori if k["dokumen_id"] == dokumen_id]
    for k in sorted(kat_dok, key=lambda x: (x["nama_tabel"], int(x["min_bulan"]))):
        kelas = NAMA_TABEL_KELAS[k["nama_tabel"]]
        prop_dasar = "upDasarBulan" if k["nama_tabel"] == "uang_pesangon" else "upmkDasarBulan"
        lines = [
            f'ktn:{k["tabel_id"]} a owl:NamedIndividual, {kelas} ;',
            f'    ktn:minBulan {int(k["min_bulan"])} ;',
        ]
        if k["max_bulan"]:
            lines.append(f'    ktn:maxBulan {int(k["max_bulan"])} ;')
        lines.append(f'    ktn:{prop_dasar} {int(k["nilai_bulan"])} ;')
        lines.append(f'    ktn:pasal {ttl_str(k["pasal"])} .')
        blok.extend(lines)
        blok.append("")

    pl_dok = [p for p in pengali_lembur if p["dokumen_id"] == dokumen_id]
    for pl in sorted(pl_dok, key=lambda x: (x["jenis_hari"], int(x["jam_min"]))):
        lines = [
            f'ktn:{pl["tabel_id"]} a owl:NamedIndividual, ktn:PengaliLembur ;',
            f'    ktn:jenisHari {ttl_str(pl["jenis_hari"])} ;',
            f'    ktn:jamMin {int(pl["jam_min"])} ;',
            f'    ktn:jamMax {int(pl["jam_max"])} ;',
            f'    ktn:pengali {angka(pl["pengali"])} ;',
            f'    ktn:pasal {ttl_str(pl["pasal"])} .',
        ]
        blok.extend(lines)
        blok.append("")

    pj_dok = [p for p in program_jamsos if p["dokumen_id"] == dokumen_id]
    for pj in sorted(pj_dok, key=lambda x: x["program_id"]):
        lines = [
            f'ktn:{pj["program_id"]} a owl:NamedIndividual, ktn:ProgramJaminanSosial ;',
            f'    ktn:jenisProgram {ttl_str(pj["jenis_program"])} ;',
            f'    ktn:tarifPengusahaPersen {angka(pj["tarif_pengusaha_persen"])} ;',
            f'    ktn:tarifPekerjaPersen {angka(pj["tarif_pekerja_persen"])} ;',
            f'    ktn:tarifTotalPersen {angka(pj["tarif_total_persen"])} ;',
        ]
        if pj["tingkat_risiko"]:
            lines.append(f'    ktn:tingkatRisiko {ttl_str(pj["tingkat_risiko"])} ;')
        lines.append(f'    ktn:pasal {ttl_str(pj["pasal"])} .')
        blok.extend(lines)
        blok.append("")

    return "\n".join(blok).rstrip() + "\n"


def main() -> int:
    for nama in REQUIRED_FILES:
        if not (DATA / nama).exists():
            print(f"[GAGAL] berkas data tidak ditemukan: data/{nama}", file=sys.stderr)
            return 1

    regulasi = baca_csv("regulasi.csv")
    norma = baca_csv("norma.csv")
    parameter = baca_csv("parameter.csv")
    kategori = baca_csv("kategori.csv")
    pengali_lembur = baca_csv("pengali_lembur.csv") if (DATA / "pengali_lembur.csv").exists() else []
    program_jamsos = baca_csv("program_jamsos.csv") if (DATA / "program_jamsos.csv").exists() else []

    err = validasi(regulasi, norma, parameter, kategori, pengali_lembur, program_jamsos)
    if err:
        print("[GAGAL] validasi data:", file=sys.stderr)
        for e in err:
            print(f"  - {e}", file=sys.stderr)
        return 1

    (ONTO / "meta").mkdir(parents=True, exist_ok=True)
    (ONTO / "regulasi").mkdir(parents=True, exist_ok=True)

    meta_path = ONTO / "meta" / "regulasi.ttl"
    meta_path.write_text(emit_meta(regulasi), encoding="utf-8")
    print(f"[tulis] {meta_path.relative_to(ROOT)}")

    topik_path = ONTO / "meta" / "topik.ttl"
    topik_path.write_text(emit_topik([n["topik"] for n in norma]), encoding="utf-8")
    print(f"[tulis] {topik_path.relative_to(ROOT)}")

    by_id = {r["dokumen_id"]: r for r in regulasi}
    dokumen_berisi = sorted(
        {n["dokumen_id"] for n in norma}
        | {k["dokumen_id"] for k in kategori}
        | {p["dokumen_id"] for p in pengali_lembur}
        | {p["dokumen_id"] for p in program_jamsos}
    )
    for dok_id in dokumen_berisi:
        slug = dok_id.lower()
        konten = emit_modul(
            dok_id,
            by_id[dok_id],
            [n for n in norma if n["dokumen_id"] == dok_id],
            parameter,
            kategori,
            pengali_lembur,
            program_jamsos,
        )
        out = ONTO / "regulasi" / f"{slug}.ttl"
        out.write_text(konten, encoding="utf-8")
        print(f"[tulis] {out.relative_to(ROOT)}")

    print(
        f"\nSelesai. {len(regulasi)} peraturan, {len(norma)} norma, "
        f"{len(parameter)} parameter, {len(kategori)} kategori, "
        f"{len(pengali_lembur)} pengali lembur, {len(program_jamsos)} program jamsos."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
