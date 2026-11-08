"""Definisi field form per topik + pembentukan graph kasus (untuk validasi SHACL).

Field di sini adalah sumber tunggal untuk: (1) memetakan input ke properti
ontologi, dan (2) memberi tahu chatbot field apa yang perlu diisi.
"""

from __future__ import annotations

from decimal import Decimal

from rdflib import Graph, Literal, Namespace
from rdflib.namespace import RDF, XSD

KTN = Namespace("https://example.org/kbr/ketenagakerjaan#")

# Spesifikasi field per topik: nama, tipe, wajib, batas, properti ontologi.
FORM = {
    "PHK": [
        {"nama": "masaKerjaBulan", "tipe": "integer", "wajib": True, "min": 0,
         "properti": KTN.masaKerjaBulan},
        {"nama": "upahBulanan", "tipe": "decimal", "wajib": True, "min": 0,
         "properti": KTN.upahBulanan},
        {"nama": "bentukHubunganKerja", "tipe": "string", "wajib": False,
         "properti": KTN.bentukHubunganKerja},
        {"nama": "alasanPHK", "tipe": "alasan", "wajib": True,
         "properti": KTN.memilikiAlasanPHK},
    ],
    "Lembur": [
        {"nama": "jamLembur", "tipe": "decimal", "wajib": True, "min": 0},
        {"nama": "padaHariKerja", "tipe": "boolean", "wajib": True},
        {"nama": "upahBulanan", "tipe": "decimal", "wajib": True, "min": 0},
    ],
    "Cuti": [
        {"nama": "masaKerjaBulan", "tipe": "integer", "wajib": True, "min": 0},
        {"nama": "peristiwa", "tipe": "string", "wajib": False},
        {"nama": "perempuan", "tipe": "boolean", "wajib": False},
    ],
    "PKWT": [
        {"nama": "bentukHubunganKerja", "tipe": "string", "wajib": True},
        {"nama": "masaKerjaBulan", "tipe": "integer", "wajib": True, "min": 1},
        {"nama": "upahBulanan", "tipe": "decimal", "wajib": True, "min": 0},
    ],
    "Jamsos": [
        {"nama": "upahBulanan", "tipe": "decimal", "wajib": True, "min": 0},
    ],
    "KIA": [
        {"nama": "sedangCutiMelahirkan", "tipe": "boolean", "wajib": True},
        {"nama": "cutiMelahirkanBulan", "tipe": "integer", "wajib": True},
        {"nama": "upahBulanan", "tipe": "decimal", "wajib": True, "min": 0},
    ],
}


def _desimal(x) -> Literal:
    return Literal(Decimal(str(x)))


def _bulat(x) -> Literal:
    return Literal(int(x), datatype=XSD.integer)


def _bool(x) -> Literal:
    return Literal(bool(x), datatype=XSD.boolean)


def buat_graph_kasus(topik: str, fakta: dict) -> Graph:
    """Bentuk graph kasus (rdflib) dari fakta form, untuk divalidasi SHACL."""
    g = Graph()
    p = KTN.KasusPekerja

    if topik == "PHK":
        g.add((p, RDF.type, KTN.Pekerja))
        g.add((p, KTN.masaKerjaBulan, _bulat(fakta["masaKerjaBulan"])))
        g.add((p, KTN.upahBulanan, _desimal(fakta["upahBulanan"])))
        if fakta.get("bentukHubunganKerja"):
            g.add((p, KTN.bentukHubunganKerja, Literal(fakta["bentukHubunganKerja"])))
        phk = KTN.KasusPHK
        g.add((p, KTN.mengalami, phk))
        g.add((phk, RDF.type, KTN.PHK))
        alasan = KTN[fakta["alasanPHK"]]
        g.add((alasan, RDF.type, KTN.AlasanPHK))
        g.add((phk, KTN.memilikiAlasanPHK, alasan))

    elif topik == "Lembur":
        g.add((p, RDF.type, KTN.Pekerja))
        g.add((p, KTN.upahBulanan, _desimal(fakta["upahBulanan"])))
        lbr = KTN.KasusLembur
        g.add((p, KTN.mengerjakanLembur, lbr))
        g.add((lbr, RDF.type, KTN.Lembur))
        g.add((lbr, KTN.jamLembur, _desimal(fakta["jamLembur"])))
        g.add((lbr, KTN.padaHariKerja, _bool(fakta.get("padaHariKerja", True))))

    elif topik == "Cuti":
        kelas = KTN.PekerjaPerempuan if fakta.get("perempuan") else KTN.Pekerja
        g.add((p, RDF.type, kelas))
        g.add((p, KTN.masaKerjaBulan, _bulat(fakta["masaKerjaBulan"])))
        if fakta.get("peristiwa"):
            per = KTN[fakta["peristiwa"]]
            g.add((per, RDF.type, KTN.PeristiwaCutiKhusus))
            g.add((p, KTN.mengalamiPeristiwa, per))

    elif topik == "PKWT":
        g.add((p, RDF.type, KTN.Pekerja))
        g.add((p, KTN.bentukHubunganKerja, Literal(fakta["bentukHubunganKerja"])))
        g.add((p, KTN.masaKerjaBulan, _bulat(fakta["masaKerjaBulan"])))
        g.add((p, KTN.upahBulanan, _desimal(fakta["upahBulanan"])))

    elif topik == "Jamsos":
        g.add((p, RDF.type, KTN.Pekerja))
        g.add((p, KTN.upahBulanan, _desimal(fakta["upahBulanan"])))

    elif topik == "KIA":
        g.add((p, RDF.type, KTN.PekerjaPerempuan))
        g.add((p, KTN.sedangCutiMelahirkan, _bool(fakta.get("sedangCutiMelahirkan", True))))
        g.add((p, KTN.cutiMelahirkanBulan, _bulat(fakta["cutiMelahirkanBulan"])))
        g.add((p, KTN.upahBulanan, _desimal(fakta["upahBulanan"])))

    else:
        raise ValueError(f"topik tidak didukung: {topik}")

    return g
