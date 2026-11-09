#!/usr/bin/env python3
"""Bangun modul RDF/XML A-Box dari CSV kanonik di data/.

Alur:
  data/regulasi.csv        -> ontology/meta/regulasi.rdf      (individu peraturan)
  data/norma.csv           -> ontology/regulasi/<dokumen>.rdf (individu norma)
  data/parameter.csv          dilampirkan ke individu norma
  data/kategori.csv           individu kategori UP/UPMK
  data/dokumen.csv         -> ontology/meta/dokumen.rdf        (jenis dokumen)
  data/regulasi_dokumen.csv   relasi peraturan -> jenis dokumen
  data/norma.csv (topik)    -> ontology/meta/topik.rdf

Sifat:
  - deterministik: keluaran diurutkan, menjalankan ulang menghasilkan berkas identik
  - memvalidasi semua rujukan sebelum menulis; build gagal bila ada pelanggaran
  - hasil ditandai "JANGAN EDIT MANUAL"

Jalankan: uv run python scripts/build_ontology.py
"""

from __future__ import annotations

import csv
import sys
from collections import defaultdict
from pathlib import Path

import yaml

import rdf_io

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ONTO = ROOT / "ontology"
VOCAB_PATH = DATA / "extraction" / "VOCAB.yaml"
SOURCES_PATH = ROOT / "docs" / "sources.yaml"

REQUIRED_FILES = [
    "regulasi.csv",
    "norma.csv",
    "parameter.csv",
    "kategori.csv",
    "dokumen.csv",
    "regulasi_dokumen.csv",
]

PREFIXES = """@prefix ktn:  <https://example.org/kbr/ketenagakerjaan#> .
@prefix reg:  <https://example.org/kbr/regulasi#> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
"""


def muat_vocab() -> dict:
    """Muat kosakata terkontrol dari data/extraction/VOCAB.yaml (satu sumber)."""
    if not VOCAB_PATH.exists():
        print(f"[GAGAL] kosakata tidak ditemukan: {VOCAB_PATH.relative_to(ROOT)}", file=sys.stderr)
        raise SystemExit(1)
    with VOCAB_PATH.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


_VOCAB = muat_vocab()
JENIS_PERATURAN = _VOCAB["jenis_peraturan"]
STATUS = _VOCAB["status_hukum"]
NAMA_TABEL_KELAS = _VOCAB["kategori"]["nama_tabel"]
ALLOWED_JENIS = set(_VOCAB["norma"]["jenis"])
ALLOWED_PARAM = set(_VOCAB["norma"]["parameter"])
JENIS_HARI_VALID = set(_VOCAB["pengali_lembur"]["jenis_hari"])
ALLOWED_PROGRAM_JAMSOS = set(_VOCAB["program_jamsos"]["jenis_program"])
ALLOWED_DASAR = set(_VOCAB["norma"]["dasar_keyakinan"])


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


def muat_sumber_pdf() -> dict[str, str]:
    """Ambil URL PDF langsung dari docs/sources.yaml (bila ada)."""
    if not SOURCES_PATH.exists():
        return {}
    data = yaml.safe_load(SOURCES_PATH.read_text(encoding="utf-8"))
    return {
        d["id"]: d["url_pdf"]
        for d in data.get("dokumen", [])
        if d.get("url_pdf")
    }


def baris_individu(subjek: str, tipe: str, props: list[str]) -> list[str]:
    return [f"{subjek} a {tipe} ;"] + [f"    {p} ;" for p in props[:-1]] + [f"    {props[-1]} ."]


def validasi(
    regulasi,
    norma,
    parameter,
    kategori,
    pengali_lembur,
    program_jamsos,
    dokumen,
    regulasi_dokumen,
) -> list[str]:
    err: list[str] = []
    reg_ids = {r["dokumen_id"] for r in regulasi}

    if len(reg_ids) != len(regulasi):
        err.append("regulasi.csv: dokumen_id duplikat")

    norm_ids = [n["norm_id"] for n in norma]
    if len(set(norm_ids)) != len(norm_ids):
        err.append("norma.csv: norm_id duplikat")

    for n in norma:
        if n["dokumen_id"] not in reg_ids:
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
        if not r["sumber"].strip():
            err.append(f"regulasi {r['dokumen_id']}: sumber kosong")

    for k in kategori:
        if k["dokumen_id"] not in reg_ids:
            err.append(f"kategori {k['tabel_id']}: dokumen_id tidak dikenal")
        if k["nama_tabel"] not in NAMA_TABEL_KELAS:
            err.append(f"kategori {k['tabel_id']}: nama_tabel tidak dikenal")
        int(k["min_bulan"])
        int(k["nilai_bulan"])
        if k["max_bulan"]:
            int(k["max_bulan"])

    for pl in pengali_lembur:
        if pl["dokumen_id"] not in reg_ids:
            err.append(f"pengali_lembur {pl['tabel_id']}: dokumen_id tidak dikenal")
        if pl["jenis_hari"] not in JENIS_HARI_VALID:
            err.append(f"pengali_lembur {pl['tabel_id']}: jenis_hari tidak dikenal")
        jmin, jmax = int(pl["jam_min"]), int(pl["jam_max"])
        if jmin > jmax:
            err.append(f"pengali_lembur {pl['tabel_id']}: jam_min > jam_max")
        float(pl["pengali"])

    for pj in program_jamsos:
        if pj["dokumen_id"] not in reg_ids:
            err.append(f"program_jamsos {pj['program_id']}: dokumen_id tidak dikenal")
        if pj["jenis_program"] not in ALLOWED_PROGRAM_JAMSOS:
            err.append(f"program_jamsos {pj['program_id']}: jenis_program tidak dikenal")
        float(pj["tarif_pengusaha_persen"])
        float(pj["tarif_pekerja_persen"])
        float(pj["tarif_total_persen"])

    for tabel, rows in [
        ("norma", norma),
        ("parameter", parameter),
        ("kategori", kategori),
        ("pengali_lembur", pengali_lembur),
        ("program_jamsos", program_jamsos),
    ]:
        for r in rows:
            d = r.get("dasar_keyakinan", "")
            if d and d not in ALLOWED_DASAR:
                err.append(f"{tabel}: dasar_keyakinan '{d}' tidak dikenal")
            if r.get("confidence"):
                float(r["confidence"])

    dok_ids = [d["dokumen_id"] for d in dokumen]
    if len(set(dok_ids)) != len(dok_ids):
        err.append("dokumen.csv: dokumen_id duplikat")
    for d in dokumen:
        if not d["nama"].strip():
            err.append(f"dokumen {d['dokumen_id']}: nama kosong")

    dok_set = set(dok_ids)
    pasangan: set[tuple[str, str]] = set()
    for m in regulasi_dokumen:
        pair = (m["peraturan_id"], m["dokumen_id"])
        if m["peraturan_id"] not in reg_ids:
            err.append(f"regulasi_dokumen: peraturan tidak dikenal: {m['peraturan_id']}")
        if m["dokumen_id"] not in dok_set:
            err.append(f"regulasi_dokumen: dokumen tidak dikenal: {m['dokumen_id']}")
        if pair in pasangan:
            err.append(f"regulasi_dokumen: duplikat {pair[0]} -> {pair[1]}")
        pasangan.add(pair)

    return err


def emit_meta(regulasi: list[dict], dokumen_map: dict[str, list[str]], url_pdf: dict[str, str]) -> str:
    blok = [
        PREFIXES,
        "<https://example.org/kbr/regulasi> a owl:Ontology ;",
        '    dct:title "Metadata peraturan ketenagakerjaan (individu)" ;',
        "    owl:imports <https://example.org/kbr/regulasi/vocab> .",
        "",
    ]
    for r in sorted(regulasi, key=lambda x: x["dokumen_id"]):
        props = [
            f'dct:title {ttl_str(r["judul"])}',
            f'reg:jenis {JENIS_PERATURAN[r["jenis"]]}',
            f'reg:nomor {ttl_str(r["nomor"])}',
            f'reg:tahun "{r["tahun"]}"^^xsd:gYear',
            f'reg:status {STATUS[r["status"]]}',
            f'reg:sumberUtama <{r["sumber"]}>',
        ]
        pdf = url_pdf.get(r["dokumen_id"])
        if pdf:
            props.append(f"reg:tautanUnduh <{pdf}>")
        for dok in dokumen_map.get(r["dokumen_id"], []):
            props.append(f"reg:menghasilkanDokumen ktn:{dok}")
        if r.get("diubah_oleh"):
            props.append(f'reg:diubahOleh reg:{r["diubah_oleh"]}')
        blok.extend(baris_individu(f'reg:{r["dokumen_id"]}', "reg:Peraturan", props))
        blok.append("")
    return "\n".join(blok).rstrip() + "\n"


def emit_topik(topik_list: list[str]) -> str:
    blok = [
        PREFIXES,
        "<https://example.org/kbr/ketenagakerjaan/meta/topik> a owl:Ontology ;",
        '    dct:title "Topik hukum (untuk retrieval)" ;',
        "    owl:imports <https://example.org/kbr/ketenagakerjaan> .",
        "",
    ]
    for t in sorted(set(topik_list)):
        blok.append(f"ktn:Topik{t} a owl:NamedIndividual, ktn:Topik ;")
        blok.append(f"    rdfs:label {ttl_str(t)} .")
        blok.append("")
    return "\n".join(blok).rstrip() + "\n"


def emit_dokumen(dokumen: list[dict]) -> str:
    blok = [
        PREFIXES,
        "<https://example.org/kbr/ketenagakerjaan/meta/dokumen> a owl:Ontology ;",
        '    dct:title "Jenis dokumen ketenagakerjaan" ;',
        "    owl:imports <https://example.org/kbr/ketenagakerjaan> .",
        "",
    ]
    for d in sorted(dokumen, key=lambda x: x["dokumen_id"]):
        props = [f'rdfs:label {ttl_str(d["nama"])}']
        if d.get("deskripsi", "").strip():
            props.append(f'rdfs:comment {ttl_str(d["deskripsi"])}')
        blok.extend(
            baris_individu(
                f'ktn:{d["dokumen_id"]}',
                "owl:NamedIndividual, ktn:JenisDokumen",
                props,
            )
        )
        blok.append("")
    return "\n".join(blok).rstrip() + "\n"


def emit_modul(
    dokumen_id,
    regulasi_row,
    norma,
    parameter,
    kategori,
    pengali_lembur,
    program_jamsos,
    url_pdf: dict[str, str],
) -> str:
    slug = dokumen_id.lower()
    sumber = "norma.csv, parameter.csv, kategori.csv, pengali_lembur.csv, program_jamsos.csv"
    onto_iri = f"https://example.org/kbr/ketenagakerjaan/regulasi/{slug}"
    sumber_url = regulasi_row["sumber"]
    pdf = url_pdf.get(dokumen_id)
    blok = [
        PREFIXES,
        f"<{onto_iri}> a owl:Ontology ;",
        f'    dct:title "Fakta norma: {regulasi_row["judul"]}" ;',
        f"    dct:source <{sumber_url}> ;",
        "    owl:imports <https://example.org/kbr/ketenagakerjaan> .",
        "",
    ]

    param_per_norm: dict[str, list[dict]] = {}
    for p in parameter:
        param_per_norm.setdefault(p["norm_id"], []).append(p)

    for n in sorted(norma, key=lambda x: x["norm_id"]):
        params = sorted(param_per_norm.get(n["norm_id"], []), key=lambda x: x["nama"])
        props = [f'ktn:{p["nama"]} {angka(p["nilai"])}' for p in params]
        props += [
            f'ktn:pasal {ttl_str(n["pasal"])}',
            f'ktn:berkaitanTopik ktn:Topik{n["topik"]}',
            f"ktn:tautanSumber <{sumber_url}>",
        ]
        if pdf:
            props.append(f"ktn:tautanUnduh <{pdf}>")
        props.append(f"dct:source reg:{n['dokumen_id']}")
        blok.extend(
            baris_individu(
                n["iri_individu"],
                f'owl:NamedIndividual, ktn:{n["jenis"]}',
                props,
            )
        )
        blok.append("")

    kat_dok = [k for k in kategori if k["dokumen_id"] == dokumen_id]
    for k in sorted(kat_dok, key=lambda x: (x["nama_tabel"], int(x["min_bulan"]))):
        kelas = NAMA_TABEL_KELAS[k["nama_tabel"]]
        prop_dasar = "upDasarBulan" if k["nama_tabel"] == "uang_pesangon" else "upmkDasarBulan"
        props = [f'ktn:minBulan {int(k["min_bulan"])}']
        if k["max_bulan"]:
            props.append(f'ktn:maxBulan {int(k["max_bulan"])}')
        props += [
            f'ktn:{prop_dasar} {int(k["nilai_bulan"])}',
            f'ktn:pasal {ttl_str(k["pasal"])}',
            f"ktn:tautanSumber <{sumber_url}>",
        ]
        if pdf:
            props.append(f"ktn:tautanUnduh <{pdf}>")
        blok.extend(baris_individu(f'ktn:{k["tabel_id"]}', f"owl:NamedIndividual, {kelas}", props))
        blok.append("")

    pl_dok = [p for p in pengali_lembur if p["dokumen_id"] == dokumen_id]
    for pl in sorted(pl_dok, key=lambda x: (x["jenis_hari"], int(x["jam_min"]))):
        props = [
            f'ktn:jenisHari {ttl_str(pl["jenis_hari"])}',
            f'ktn:jamMin {int(pl["jam_min"])}',
            f'ktn:jamMax {int(pl["jam_max"])}',
            f'ktn:pengali {angka(pl["pengali"])}',
            f'ktn:pasal {ttl_str(pl["pasal"])}',
            f"ktn:tautanSumber <{sumber_url}>",
        ]
        if pdf:
            props.append(f"ktn:tautanUnduh <{pdf}>")
        blok.extend(
            baris_individu(
                f'ktn:{pl["tabel_id"]}',
                "owl:NamedIndividual, ktn:PengaliLembur",
                props,
            )
        )
        blok.append("")

    pj_dok = [p for p in program_jamsos if p["dokumen_id"] == dokumen_id]
    for pj in sorted(pj_dok, key=lambda x: x["program_id"]):
        props = [
            f'ktn:jenisProgram {ttl_str(pj["jenis_program"])}',
            f'ktn:tarifPengusahaPersen {angka(pj["tarif_pengusaha_persen"])}',
            f'ktn:tarifPekerjaPersen {angka(pj["tarif_pekerja_persen"])}',
            f'ktn:tarifTotalPersen {angka(pj["tarif_total_persen"])}',
        ]
        if pj["tingkat_risiko"]:
            props.append(f'ktn:tingkatRisiko {ttl_str(pj["tingkat_risiko"])}')
        props += [
            f'ktn:pasal {ttl_str(pj["pasal"])}',
            f"ktn:tautanSumber <{sumber_url}>",
        ]
        if pdf:
            props.append(f"ktn:tautanUnduh <{pdf}>")
        blok.extend(
            baris_individu(
                f'ktn:{pj["program_id"]}',
                "owl:NamedIndividual, ktn:ProgramJaminanSosial",
                props,
            )
        )
        blok.append("")

    return "\n".join(blok).rstrip() + "\n"


def tulis_teks_ke_rdfxml(path: Path, ttl_text: str, sumber: str) -> None:
    g = rdf_io.baca_turtle(ttl_text)
    rdf_io.tulis_rdfxml(path, g, rdf_io.header_generate(sumber))


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
    dokumen = baca_csv("dokumen.csv")
    regulasi_dokumen = baca_csv("regulasi_dokumen.csv")
    url_pdf = muat_sumber_pdf()

    err = validasi(
        regulasi,
        norma,
        parameter,
        kategori,
        pengali_lembur,
        program_jamsos,
        dokumen,
        regulasi_dokumen,
    )
    if err:
        print("[GAGAL] validasi data:", file=sys.stderr)
        for e in err:
            print(f"  - {e}", file=sys.stderr)
        return 1

    (ONTO / "meta").mkdir(parents=True, exist_ok=True)
    (ONTO / "regulasi").mkdir(parents=True, exist_ok=True)

    dokumen_map: dict[str, list[str]] = defaultdict(list)
    for m in regulasi_dokumen:
        dokumen_map[m["peraturan_id"]].append(m["dokumen_id"])
    for key in dokumen_map:
        dokumen_map[key].sort()

    meta_path = ONTO / "meta" / "regulasi.rdf"
    tulis_teks_ke_rdfxml(meta_path, emit_meta(regulasi, dokumen_map, url_pdf), "regulasi.csv")
    print(f"[tulis] {meta_path.relative_to(ROOT)}")

    topik_path = ONTO / "meta" / "topik.rdf"
    tulis_teks_ke_rdfxml(
        topik_path,
        emit_topik([n["topik"] for n in norma]),
        "norma.csv (kolom topik)",
    )
    print(f"[tulis] {topik_path.relative_to(ROOT)}")

    dokumen_path = ONTO / "meta" / "dokumen.rdf"
    tulis_teks_ke_rdfxml(dokumen_path, emit_dokumen(dokumen), "dokumen.csv")
    print(f"[tulis] {dokumen_path.relative_to(ROOT)}")

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
            url_pdf,
        )
        out = ONTO / "regulasi" / f"{slug}.rdf"
        tulis_teks_ke_rdfxml(
            out,
            konten,
            "norma.csv, parameter.csv, kategori.csv, pengali_lembur.csv, program_jamsos.csv",
        )
        print(f"[tulis] {out.relative_to(ROOT)}")

    # Bersihkan output TTL lama (generated) agar tidak ada duplikasi format.
    for stale in list((ONTO / "meta").glob("*.ttl")) + list((ONTO / "regulasi").glob("*.ttl")):
        stale.unlink()

    print(
        f"\nSelesai. {len(regulasi)} peraturan, {len(norma)} norma, "
        f"{len(parameter)} parameter, {len(kategori)} kategori, "
        f"{len(pengali_lembur)} pengali lembur, {len(program_jamsos)} program jamsos, "
        f"{len(dokumen)} jenis dokumen."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
