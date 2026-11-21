#!/usr/bin/env python3
"""Bangun modul SWRL kalkulasi sebagai RDF/XML deterministik.

Rule membaca ABox kasus dari backend (lihat backend/KB_CONTRACT.md) dan
menghasilkan data property hasil hitung. Modul ini diimpor otomatis oleh
ontology/ontology.rdf lewat scripts/build_catalog.py.

Jalankan: uv run python scripts/build_swrl.py
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path
from xml.sax.saxutils import escape

import rdf_io

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ONTO = ROOT / "ontology"
OUT = ONTO / "core" / "swrl-kalkulasi.rdf"

KTN = "https://example.org/kbr/ketenagakerjaan#"
ONTO_IRI = "https://example.org/kbr/ketenagakerjaan/swrl-kalkulasi"
KB_IRI = "https://example.org/kbr/ketenagakerjaan"
SWRL = "http://www.w3.org/2003/11/swrl#"
SWRLB = "http://www.w3.org/2003/11/swrlb#"
XSD = "http://www.w3.org/2001/XMLSchema#"
RDFNS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"

# nama_tabel -> (kelas, properti dasar, properti hasil, kelas terbuka, kode)
KATEGORI_KELAS = {
    "uang_pesangon": ("KategoriUP", "upDasarBulan", "upDasar", "KategoriUPTerbuka", "UP"),
    "upmk": ("KategoriUPMK", "upmkDasarBulan", "upmkDasar", "KategoriUPMKTerbuka", "UPMK"),
}


# --------------------------------------------------------------------------
# Representasi atom SWRL
# --------------------------------------------------------------------------
def v(nama: str) -> tuple[str, str]:
    """Variabel SWRL."""
    return ("var", nama)


def i(nama: str) -> tuple[str, str]:
    """Individu bernama."""
    return ("ind", nama)


def d(nilai: str | float | int) -> tuple[str, str, str]:
    """Literal xsd:decimal."""
    return ("lit", str(nilai), "decimal")


def n(nilai: int) -> tuple[str, str, str]:
    """Literal xsd:integer."""
    return ("lit", str(nilai), "integer")


def b(nilai: bool) -> tuple[str, str, str]:
    """Literal xsd:boolean."""
    return ("lit", "true" if nilai else "false", "boolean")


def s(nilai: str) -> tuple[str, str, str]:
    """Literal xsd:string."""
    return ("lit", nilai, "string")


def a_class(kelas: str, arg) -> tuple:
    return ("class", kelas, arg)


def a_data(prop: str, subjek, objek) -> tuple:
    return ("data", prop, subjek, objek)


def a_obj(prop: str, subjek, objek) -> tuple:
    return ("obj", prop, subjek, objek)


def a_builtin(nama: str, *args) -> tuple:
    return ("builtin", nama, list(args))


# --------------------------------------------------------------------------
# Render RDF/XML
# --------------------------------------------------------------------------
def _arg(tag: str, arg) -> str:
    jenis = arg[0]
    if jenis == "var":
        return f'<{tag} rdf:resource="{KTN}v_{arg[1]}"/>'
    if jenis == "ind":
        return f'<{tag} rdf:resource="{KTN}{arg[1]}"/>'
    return f'<{tag} rdf:datatype="{XSD}{arg[2]}">{escape(arg[1])}</{tag}>'


def render_arg_list(args: list, pad: str) -> str:
    """Daftar argumen builtin, bersarang seperti serialisasi OWLAPI."""
    arg = args[0]
    if arg[0] == "lit":
        pertama = f'{pad}<rdf:first rdf:datatype="{XSD}{arg[2]}">{escape(arg[1])}</rdf:first>'
    elif arg[0] == "var":
        pertama = f'{pad}<rdf:first rdf:resource="{KTN}v_{arg[1]}"/>'
    else:
        pertama = f'{pad}<rdf:first rdf:resource="{KTN}{arg[1]}"/>'

    if len(args) == 1:
        sisa = f'{pad}<rdf:rest rdf:resource="{RDFNS}nil"/>'
    else:
        sisa = (
            f"{pad}<rdf:rest>\n"
            f"{render_arg_list(args[1:], pad + '  ')}\n"
            f"{pad}</rdf:rest>"
        )
    return (
        f"{pad}<rdf:Description>\n"
        f'{pad}  <rdf:type rdf:resource="{RDFNS}List"/>\n'
        f"{pertama}\n{sisa}\n"
        f"{pad}</rdf:Description>"
    )


def render_atom(atom: tuple, pad: str) -> str:
    """Render satu atom sebagai node element bertipe swrl:*."""
    jenis = atom[0]
    if jenis == "class":
        return "\n".join(
            [
                f"{pad}<rdf:Description>",
                f'{pad}  <rdf:type rdf:resource="{SWRL}ClassAtom"/>',
                f'{pad}  <swrl:classPredicate rdf:resource="{KTN}{atom[1]}"/>',
                f"{pad}  {_arg('swrl:argument1', atom[2])}",
                f"{pad}</rdf:Description>",
            ]
        )
    if jenis in ("data", "obj"):
        # SWRL memakai istilah "DatavaluedPropertyAtom" (bukan DatatypePropertyAtom).
        tipe = "DatavaluedPropertyAtom" if jenis == "data" else "IndividualPropertyAtom"
        return "\n".join(
            [
                f"{pad}<rdf:Description>",
                f'{pad}  <rdf:type rdf:resource="{SWRL}{tipe}"/>',
                f'{pad}  <swrl:propertyPredicate rdf:resource="{KTN}{atom[1]}"/>',
                f"{pad}  {_arg('swrl:argument1', atom[2])}",
                f"{pad}  {_arg('swrl:argument2', atom[3])}",
                f"{pad}</rdf:Description>",
            ]
        )

    args = atom[2]
    if args:
        argumen = (
            f"{pad}  <swrl:arguments>\n"
            f"{render_arg_list(args, pad + '    ')}\n"
            f"{pad}  </swrl:arguments>"
        )
    else:
        argumen = f'{pad}  <swrl:arguments rdf:resource="{RDFNS}nil"/>'
    return "\n".join(
        [
            f"{pad}<rdf:Description>",
            f'{pad}  <rdf:type rdf:resource="{SWRL}BuiltinAtom"/>',
            f'{pad}  <swrl:builtin rdf:resource="{SWRLB}{atom[1]}"/>',
            argumen,
            f"{pad}</rdf:Description>",
        ]
    )


def render_atom_list(atoms: list, pad: str) -> str:
    """Render body/head sebagai daftar bertipe swrl:AtomList (format OWLAPI)."""
    atom_xml = render_atom(atoms[0], pad + "      ")
    if len(atoms) == 1:
        sisa = f'{pad}<rdf:rest rdf:resource="{RDFNS}nil"/>'
    else:
        sisa = (
            f"{pad}<rdf:rest>\n"
            f"{render_atom_list(atoms[1:], pad + '  ')}\n"
            f"{pad}</rdf:rest>"
        )
    return (
        f"{pad}<rdf:Description>\n"
        f'{pad}  <rdf:type rdf:resource="{SWRL}AtomList"/>\n'
        f"{pad}  <rdf:first>\n{atom_xml}\n{pad}  </rdf:first>\n"
        f"{sisa}\n"
        f"{pad}</rdf:Description>"
    )


def render_rule(rule_id: str, label: str, body: list, head: list) -> str:
    return "\n".join(
        [
            f'  <rdf:Description rdf:nodeID="rule-{rule_id}">',
            f'    <rdf:type rdf:resource="{SWRL}Imp"/>',
            f"    <rdfs:label>{escape(label)}</rdfs:label>",
            "    <swrl:body>",
            render_atom_list(body, "      "),
            "    </swrl:body>",
            "    <swrl:head>",
            render_atom_list(head, "      "),
            "    </swrl:head>",
            "  </rdf:Description>",
        ]
    )


def kumpulkan_var(atoms) -> list[str]:
    hasil: set[str] = set()

    def jalan(x) -> None:
        if isinstance(x, tuple):
            if x and x[0] == "var":
                hasil.add(x[1])
            else:
                for bagian in x[1:]:
                    jalan(bagian)
        elif isinstance(x, list):
            for bagian in x:
                jalan(bagian)

    jalan(atoms)
    return sorted(hasil)


# --------------------------------------------------------------------------
# Definisi rule
# --------------------------------------------------------------------------
def aturan_phk_bracket(kategori: list[dict[str, str]]) -> list[tuple]:
    """Satu rule per bracket (dideduplikasi antar-peraturan yang nilainya sama)."""
    unik: dict[tuple[str, int, str, int], dict[str, str]] = {}
    for k in kategori:
        if k["nama_tabel"] not in KATEGORI_KELAS:
            continue
        kunci = (k["nama_tabel"], int(k["min_bulan"]), k["max_bulan"], int(k["nilai_bulan"]))
        unik[kunci] = k

    hasil: list[tuple] = []
    for tabel, lo, hi, _ in sorted(unik, key=lambda x: (x[0], x[1])):
        kelas, dasar, target, terbuka, kode = KATEGORI_KELAS[tabel]
        body = [
            a_class(kelas if hi else terbuka, v("k")),
            a_data("minBulan", v("k"), v("lo")),
            a_data(dasar, v("k"), v("d")),
            a_class("Pekerja", v("p")),
            a_data("masaKerjaBulan", v("p"), v("m")),
            a_builtin("greaterThanOrEqual", v("m"), v("lo")),
        ]
        if hi:
            body.insert(2, a_data("maxBulan", v("k"), v("hi")))
            body.append(a_builtin("lessThan", v("m"), v("hi")))
            rule_id = f"PHK-{kode}-{lo}-{hi}"
            label = f"PHK: {kode} {lo}-{hi} bulan -> {target}"
        else:
            rule_id = f"PHK-{kode}-{lo}-INF"
            label = f"PHK: {kode} >= {lo} bulan -> {target}"
        hasil.append((rule_id, label, body, [a_data(target, v("p"), v("d"))]))
    return hasil


def aturan_phk_upmk_nol() -> tuple:
    """UPMK tidak diberikan untuk masa kerja di bawah 36 bulan."""
    body = [
        a_class("Pekerja", v("p")),
        a_data("masaKerjaBulan", v("p"), v("m")),
        a_builtin("lessThan", v("m"), n(36)),
    ]
    return (
        "PHK-UPMK-0-36",
        "PHK: UPMK 0 bulan untuk masa kerja < 36 bulan",
        body,
        [a_data("upmkDasar", v("p"), n(0))],
    )


def aturan_phk_final() -> tuple:
    body = [
        a_class("Pekerja", v("p")),
        a_obj("mengalami", v("p"), v("phk")),
        a_obj("memilikiAlasanPHK", v("phk"), v("alasan")),
        a_data("pengaliUP", v("alasan"), v("f1")),
        a_data("pengaliUPMK", v("alasan"), v("f2")),
        a_data("upDasar", v("p"), v("d1")),
        a_data("upmkDasar", v("p"), v("d2")),
        a_data("upahBulanan", v("p"), v("u")),
        a_builtin("multiply", v("b1"), v("d1"), v("f1")),
        a_builtin("multiply", v("b2"), v("d2"), v("f2")),
        a_builtin("add", v("total"), v("b1"), v("b2")),
        a_builtin("multiply", v("nominal"), v("total"), v("u")),
    ]
    head = [
        a_data("bulanUP", v("p"), v("b1")),
        a_data("bulanUPMK", v("p"), v("b2")),
        a_data("totalBulan", v("p"), v("total")),
        a_data("nominalPesangon", v("p"), v("nominal")),
    ]
    return ("PHK-NOMINAL", "PHK: bulanUP x pengali, total, nominal pesangon", body, head)


def aturan_pkwt() -> tuple:
    body = [
        a_class("Pekerja", v("p")),
        a_data("masaKerjaBulan", v("p"), v("m")),
        a_data("upahBulanan", v("p"), v("u")),
        a_data("faktorPembagiKompensasi", i("BesaranUangKompensasiPKWT"), v("f")),
        a_builtin("divide", v("bulan"), v("m"), v("f")),
        a_builtin("multiply", v("nominal"), v("bulan"), v("u")),
    ]
    head = [
        a_data("kompensasiBulan", v("p"), v("bulan")),
        a_data("nominalKompensasiPKWT", v("p"), v("nominal")),
    ]
    return ("PKWT-KOMPENSASI", "PKWT: masa kerja / faktor x upah", body, head)


def aturan_jamsos() -> tuple:
    body = [
        a_class("Pekerja", v("p")),
        a_data("upahBulanan", v("p"), v("u")),
        a_data("tarifPekerjaPersen", i("JHT"), v("a")),
        a_data("tarifPekerjaPersen", i("JP"), v("b")),
        a_data("tarifPengusahaPersen", i("JHT"), v("c")),
        a_data("tarifPengusahaPersen", i("JP"), v("d")),
        a_builtin("add", v("persenPekerja"), v("a"), v("b")),
        a_builtin("add", v("persenPengusaha"), v("c"), v("d")),
        a_builtin("divide", v("fraksiPekerja"), v("persenPekerja"), n(100)),
        a_builtin("multiply", v("iuranPekerja"), v("fraksiPekerja"), v("u")),
        a_builtin("divide", v("fraksiPengusaha"), v("persenPengusaha"), n(100)),
        a_builtin("multiply", v("iuranPengusaha"), v("fraksiPengusaha"), v("u")),
    ]
    head = [
        a_data("persenPekerja", v("p"), v("persenPekerja")),
        a_data("persenPengusaha", v("p"), v("persenPengusaha")),
        a_data("iuranPekerja", v("p"), v("iuranPekerja")),
        a_data("iuranPengusaha", v("p"), v("iuranPengusaha")),
    ]
    return ("JAMSOS-JHT-JP", "Jamsos: tarif JHT + JP x upah", body, head)


def aturan_kia() -> list[tuple]:
    dasar = [
        a_class("PekerjaPerempuan", v("p")),
        a_data("sedangCutiMelahirkan", v("p"), b(True)),
        a_data("cutiMelahirkanBulan", v("p"), v("bulan")),
        a_data("upahBulanan", v("p"), v("u")),
        a_data("bulanUpahPenuh", i("KetentuanUpahCutiMelahirkan"), v("penuh")),
    ]
    kepala = [a_data("nominalUpahCutiMelahirkan", v("p"), v("nominal"))]

    penuh = (
        "KIA-UPAH-PENUH",
        "KIA: cuti < bulan upah penuh dibayar penuh",
        dasar
        + [
            a_builtin("lessThan", v("bulan"), v("penuh")),
            a_builtin("multiply", v("nominal"), v("bulan"), v("u")),
        ],
        [a_data("totalBulanUpah", v("p"), v("bulan"))] + kepala,
    )
    sisa = (
        "KIA-UPAH-SISA",
        "KIA: sisa bulan setelah upah penuh dibayar 75%",
        dasar
        + [
            a_builtin("greaterThanOrEqual", v("bulan"), v("penuh")),
            a_builtin("subtract", v("sisa"), v("bulan"), v("penuh")),
            a_builtin("multiply", v("bagian75"), v("sisa"), d("0.75")),
            a_builtin("add", v("total"), v("penuh"), v("bagian75")),
            a_builtin("multiply", v("nominal"), v("total"), v("u")),
        ],
        [a_data("totalBulanUpah", v("p"), v("total"))] + kepala,
    )
    return [penuh, sisa]


def aturan_lembur() -> list[tuple]:
    upah_sejam = (
        "LEMBUR-UPAH-SEJAM",
        "Lembur: upah bulanan / faktor pembagi upah sejam",
        [
            a_class("Pekerja", v("p")),
            a_data("upahBulanan", v("p"), v("u")),
            a_data("faktorPembagiUpahSejam", i("UpahSejamLembur"), v("f")),
            a_builtin("divide", v("sejam"), v("u"), v("f")),
        ],
        [a_data("upahSejam", v("p"), v("sejam"))],
    )
    hari_kerja = (
        "LEMBUR-JENIS-HARI-KERJA",
        "Lembur: pada hari kerja -> jenis hari_kerja",
        [a_class("Lembur", v("l")), a_data("padaHariKerja", v("l"), b(True))],
        [a_data("jenisHariLembur", v("l"), s("hari_kerja"))],
    )
    hari_libur = (
        "LEMBUR-JENIS-LIBUR-5",
        "Lembur: bukan hari kerja -> jenis libur_5hari",
        [a_class("Lembur", v("l")), a_data("padaHariKerja", v("l"), b(False))],
        [a_data("jenisHariLembur", v("l"), s("libur_5hari"))],
    )
    lookup = (
        "LEMBUR-PENGALI-TOTAL",
        "Lembur: jenis hari + jumlah jam -> total pengali akumulatif",
        [
            a_class("Lembur", v("l")),
            a_data("jenisHariLembur", v("l"), v("jenis")),
            a_data("jamLembur", v("l"), v("jam")),
            a_class("AkumulasiLembur", v("t")),
            a_data("jenisHariAkumulasi", v("t"), v("jenis")),
            a_data("jamAkumulasi", v("t"), v("jam")),
            a_data("pengaliTotal", v("t"), v("pengali")),
        ],
        [a_data("pengaliTotalLembur", v("l"), v("pengali"))],
    )
    nominal = (
        "LEMBUR-NOMINAL",
        "Lembur: total pengali x upah sejam",
        [
            a_class("Pekerja", v("p")),
            a_obj("mengerjakanLembur", v("p"), v("l")),
            a_data("pengaliTotalLembur", v("l"), v("pengali")),
            a_data("upahSejam", v("p"), v("sejam")),
            a_builtin("multiply", v("nominal"), v("pengali"), v("sejam")),
        ],
        [a_data("nominalLembur", v("p"), v("nominal"))],
    )
    return [upah_sejam, hari_kerja, hari_libur, lookup, nominal]


def aturan_cuti() -> tuple:
    body = [
        a_class("MemenuhiSyaratCutiTahunan", v("p")),
        a_data("hariDibayar", i("CutiTahunan12Hari"), v("hari")),
    ]
    return (
        "CUTI-TAHUNAN",
        "Cuti: memenuhi syarat -> hari cuti tahunan dari KB",
        body,
        [a_data("cutiTahunanHari", v("p"), v("hari"))],
    )


def aturan_cuti_khusus() -> tuple:
    body = [
        a_class("Pekerja", v("p")),
        a_obj("mengalamiPeristiwa", v("p"), v("e")),
        a_data("hariDibayar", v("e"), v("hari")),
    ]
    return (
        "CUTI-KHUSUS",
        "Cuti: peristiwa khusus -> hari dibayar dari KB",
        body,
        [a_data("cutiKhususHari", v("p"), v("hari"))],
    )


def baca_csv(nama: str) -> list[dict[str, str]]:
    path = DATA / nama
    if not path.exists():
        print(f"[GAGAL] berkas data tidak ditemukan: data/{nama}", file=sys.stderr)
        raise SystemExit(1)
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main() -> int:
    kategori = baca_csv("kategori.csv")

    rules: list[tuple] = []
    rules += aturan_phk_bracket(kategori)
    rules.append(aturan_phk_upmk_nol())
    rules.append(aturan_phk_final())
    rules.append(aturan_pkwt())
    rules.append(aturan_jamsos())
    rules += aturan_kia()
    rules += aturan_lembur()
    rules.append(aturan_cuti())
    rules.append(aturan_cuti_khusus())

    semua_var: set[str] = set()
    for _, _, body, head in rules:
        semua_var.update(kumpulkan_var(body))
        semua_var.update(kumpulkan_var(head))

    header = rdf_io.header_generate("kategori.csv, pengali_lembur.csv", "build_swrl.py")
    baris = [
        '<?xml version="1.0" encoding="utf-8"?>',
        "<!-- " + header.replace("--", "- -") + " -->",
        '<rdf:RDF xmlns:ktn="https://example.org/kbr/ketenagakerjaan#"',
        '   xmlns:owl="http://www.w3.org/2002/07/owl#"',
        '   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"',
        '   xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"',
        '   xmlns:dct="http://purl.org/dc/terms/"',
        '   xmlns:swrl="http://www.w3.org/2003/11/swrl#"',
        '   xmlns:xsd="http://www.w3.org/2001/XMLSchema#">',
        f'  <rdf:Description rdf:about="{ONTO_IRI}">',
        '    <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#Ontology"/>',
        "    <dct:title>Rule SWRL kalkulasi hak ketenagakerjaan</dct:title>",
        f'    <owl:imports rdf:resource="{KB_IRI}"/>',
        "  </rdf:Description>",
    ]

    for nama in sorted(semua_var):
        baris.append(f'  <swrl:Variable rdf:about="{KTN}v_{nama}"/>')

    for rule_id, label, body, head in rules:
        baris.append(render_rule(rule_id, label, body, head))

    baris.append("</rdf:RDF>")
    OUT.write_text("\n".join(baris) + "\n", encoding="utf-8")

    print(f"[tulis] {OUT.relative_to(ROOT)} ({len(rules)} rule, {len(semua_var)} variabel)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
