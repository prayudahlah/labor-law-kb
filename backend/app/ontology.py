"""Akses KB: memuat Turtle ke cache RDF/XML dan menjalankan HermiT per permintaan.

KB bersifat statis. Fakta kasus user dibentuk sementara di dalam satu `World`,
dinalar, lalu World ditutup. KB tidak pernah diubah.
"""

from __future__ import annotations

import sys
from pathlib import Path

import owlready2
import rdflib
from owlready2 import World, sync_reasoner

from .config import CACHE_KB, ONTO_DIR

KTN = "https://example.org/kbr/ketenagakerjaan#"

KELAS_HAK = [
    "MemenuhiSyaratPesangon",
    "MemenuhiSyaratUPMK",
    "MemenuhiSyaratUPH",
    "MemenuhiSyaratUangPisah",
    "MemenuhiSyaratCutiTahunan",
    "MemenuhiSyaratCutiHaid",
    "MemenuhiSyaratCutiKhusus",
    "MemenuhiSyaratUpahLembur",
    "MemenuhiSyaratKompensasiPKWT",
    "MemenuhiSyaratJaminanSosial",
    "MemenuhiSyaratCutiMelahirkan",
    "MemenuhiSyaratCutiKeguguran",
    "MemenuhiSyaratMenyusui",
    "MemenuhiSyaratCutiPendampinganSuami",
]

_KB_BYTES: bytes | None = None
_GRAPH: rdflib.Graph | None = None


def ttl_files() -> list[Path]:
    files: list[Path] = []
    for sub in ("core", "meta", "regulasi"):
        files += sorted(ONTO_DIR.glob(f"{sub}/*.ttl"))
    return files


def _bangun_cache() -> None:
    files = ttl_files()
    newest = max(f.stat().st_mtime for f in files)
    if CACHE_KB.exists() and CACHE_KB.stat().st_mtime >= newest:
        return
    g = rdflib.Graph()
    for f in files:
        g.parse(f, format="turtle")
    g.remove((None, rdflib.OWL.imports, None))
    CACHE_KB.parent.mkdir(parents=True, exist_ok=True)
    CACHE_KB.write_bytes(g.serialize(format="xml").encode("utf-8"))


def muat_kb() -> int:
    """Bangun cache bila perlu, simpan bytes KB + graf rdflib di memori. Saat startup."""
    global _KB_BYTES, _GRAPH
    _bangun_cache()
    _KB_BYTES = CACHE_KB.read_bytes()
    _GRAPH = rdflib.Graph()
    _GRAPH.parse(data=_KB_BYTES, format="xml")
    return len(_KB_BYTES)


def graph() -> rdflib.Graph:
    if _GRAPH is None:
        muat_kb()
    return _GRAPH


def ktn(nama: str, world: World):
    ent = world.search_one(iri=f"{KTN}{nama}")
    if ent is None:
        raise KeyError(f"entitas tidak ditemukan di KB: ktn:{nama}")
    return ent


def _world_kb() -> World:
    if _KB_BYTES is None:
        muat_kb()
    w = World()
    w.get_ontology(CACHE_KB.resolve().as_uri()).load()
    return w


# --- Helper ---------------------------------------------------------------

def _nilai(ind, prop: str, default=None):
    vals = getattr(ind, prop, None)
    return vals[0] if vals else default


def _hak(w: World, ind) -> list[str]:
    return [k.replace("MemenuhiSyarat", "") for k in KELAS_HAK if ind in ktn(k, w).instances()]


def _pasal(w: World, *iris: str) -> list[str]:
    out: list[str] = []
    for iri in iris:
        ent = w.search_one(iri=f"{KTN}{iri}")
        if ent is not None:
            out += [str(p) for p in (getattr(ent, "pasal", None) or [])]
    return out


# --- Builder kasus per topik ---------------------------------------------

def _kasus_phk(w: World, fakta: dict) -> dict:
    from . import rules

    Pekerja = ktn("Pekerja", w)
    PHK = ktn("PHK", w)
    alasan = ktn(fakta["alasanPHK"], w)

    p = Pekerja("KasusPekerja")
    p.masaKerjaBulan = [int(fakta["masaKerjaBulan"])]
    p.upahBulanan = [float(fakta["upahBulanan"])]
    if fakta.get("bentukHubunganKerja"):
        p.bentukHubunganKerja = [fakta["bentukHubunganKerja"]]

    phk = PHK("KasusPHK")
    phk.memilikiAlasanPHK = alasan
    p.mengalami = [phk]
    sync_reasoner(w)

    h = rules.hitung_pesangon(p, alasan, w)
    return {
        "mode": "inferensi", "hak": _hak(w, p),
        "rincian": {"pesangon_bulan": h["bulan_up"], "upmk_bulan": h["bulan_upmk"],
                    "total_bulan": h["total_bulan"]},
        "nominal": h["nominal"],
        "pasal": _pasal(w, fakta["alasanPHK"]),
        "catatan": "Bukan nasihat hukum.",
    }


def _kasus_lembur(w: World, fakta: dict) -> dict:
    from . import rules

    p = ktn("Pekerja", w)("KasusPekerja")
    p.upahBulanan = [float(fakta["upahBulanan"])]
    lbr = ktn("Lembur", w)("KasusLembur")
    lbr.jamLembur = [float(fakta["jamLembur"])]
    lbr.padaHariKerja = [bool(fakta.get("padaHariKerja", True))]
    p.mengerjakanLembur = [lbr]
    sync_reasoner(w)

    h = rules.hitung_lembur(p, lbr, w)
    return {
        "mode": "inferensi", "hak": _hak(w, p),
        "rincian": {"jam": h["jam"], "upah_sejam": round(h["upah_sejam"], 2)},
        "nominal": h["nominal"],
        "pasal": _pasal(w, "UpahSejamLembur", "BatasJamLembur"),
        "catatan": "Bukan nasihat hukum.",
    }


def _kasus_cuti(w: World, fakta: dict) -> dict:
    kelas = ktn("PekerjaPerempuan" if fakta.get("perempuan") else "Pekerja", w)
    p = kelas("KasusPekerja")
    p.masaKerjaBulan = [int(fakta["masaKerjaBulan"])]

    per = None
    if fakta.get("peristiwa"):
        per = ktn(fakta["peristiwa"], w)
        p.mengalamiPeristiwa = [per]
    sync_reasoner(w)

    hak = _hak(w, p)
    rincian: dict = {}
    if "CutiTahunan" in hak:
        rincian["cuti_tahunan_hari"] = 12
    if per is not None:
        rincian["peristiwa"] = fakta["peristiwa"]
        rincian["hari_dibayar"] = _nilai(per, "hariDibayar")
    if "CutiHaid" in hak:
        rincian["cuti_haid_hari"] = 2
    return {
        "mode": "inferensi", "hak": hak, "rincian": rincian, "nominal": None,
        "pasal": _pasal(w, "MemenuhiSyaratCutiTahunan", "MemenuhiSyaratCutiKhusus",
                        "MemenuhiSyaratCutiHaid"),
        "catatan": "Bukan nasihat hukum.",
    }


def _kasus_pkwt(w: World, fakta: dict) -> dict:
    from . import rules

    p = ktn("Pekerja", w)("KasusPekerja")
    p.bentukHubunganKerja = [fakta["bentukHubunganKerja"]]
    p.masaKerjaBulan = [int(fakta["masaKerjaBulan"])]
    p.upahBulanan = [float(fakta["upahBulanan"])]
    sync_reasoner(w)

    h = rules.hitung_kompensasi_pkwt(p, w)
    return {
        "mode": "inferensi", "hak": _hak(w, p),
        "rincian": {"masa_kerja": h["masa_kerja"], "kompensasi_bulan": h["bulan"]},
        "nominal": h["nominal"],
        "pasal": _pasal(w, "KetentuanKompensasiPKWT"),
        "catatan": "Bukan nasihat hukum.",
    }


def _kasus_jamsos(w: World, fakta: dict) -> dict:
    from . import rules

    p = ktn("Pekerja", w)("KasusPekerja")
    p.upahBulanan = [float(fakta["upahBulanan"])]
    sync_reasoner(w)

    h = rules.hitung_iuran_jht_jp(p, w)
    return {
        "mode": "inferensi", "hak": _hak(w, p),
        "rincian": {"iuran_pekerja": h["iuran_pekerja"], "iuran_pengusaha": h["iuran_pengusaha"],
                    "persen_pekerja": h["persen_pekerja"], "persen_pengusaha": h["persen_pengusaha"]},
        "nominal": h["iuran_pekerja"],
        "pasal": _pasal(w, "JHT", "JP"),
        "catatan": "Bukan nasihat hukum.",
    }


def _kasus_kia(w: World, fakta: dict) -> dict:
    from . import rules

    p = ktn("PekerjaPerempuan", w)("KasusPekerja")
    p.sedangCutiMelahirkan = [bool(fakta.get("sedangCutiMelahirkan", True))]
    p.cutiMelahirkanBulan = [int(fakta["cutiMelahirkanBulan"])]
    p.upahBulanan = [float(fakta["upahBulanan"])]
    sync_reasoner(w)

    h = rules.hitung_upah_cuti_melahirkan(p, w)
    return {
        "mode": "inferensi", "hak": _hak(w, p),
        "rincian": {"cuti_bulan": h["bulan"], "upah_bulan": h["total_bulan_upah"]},
        "nominal": h["nominal"],
        "pasal": _pasal(w, "KetentuanUpahCutiMelahirkan"),
        "catatan": "Bukan nasihat hukum.",
    }


_DISPATCH = {
    "PHK": _kasus_phk,
    "Lembur": _kasus_lembur,
    "Cuti": _kasus_cuti,
    "PKWT": _kasus_pkwt,
    "Jamsos": _kasus_jamsos,
    "KIA": _kasus_kia,
}


def analisis(topik: str, fakta: dict) -> dict:
    """Jalankan inferensi + hitung untuk satu topik, lalu tutup World."""
    if topik not in _DISPATCH:
        raise ValueError(f"topik tidak didukung: {topik}")
    w = _world_kb()
    try:
        res = _DISPATCH[topik](w, fakta)
        if isinstance(res.get("nominal"), float):
            res["nominal"] = round(res["nominal"])
        return res
    finally:
        w.close()
