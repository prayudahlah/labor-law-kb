"""Validasi closed-world graph kasus memakai SHACL (pyshacl).

Shape dipilih sesuai topik agar tidak saling bertentangan (satu permintaan = satu topik).
"""

from __future__ import annotations

from pathlib import Path

from pyshacl import validate
from rdflib import Graph

SHAPES_DIR = Path(__file__).parent / "shapes"

SHAPE_BY_TOPIK = {
    "PHK": "phk.ttl",
    "Lembur": "lembur.ttl",
    "Cuti": "cuti.ttl",
    "PKWT": "pkwt.ttl",
    "Jamsos": "jamsos.ttl",
    "KIA": "kia.ttl",
}

_cache: dict[str, Graph] = {}


def _shapes(topik: str) -> Graph:
    if topik not in _cache:
        _cache[topik] = Graph().parse(SHAPES_DIR / SHAPE_BY_TOPIK[topik], format="turtle")
    return _cache[topik]


def validasi(topik: str, data_graph: Graph) -> tuple[bool, str]:
    """Kembalikan (conform, laporan_teks)."""
    conform, _results_graph, results_text = validate(
        data_graph,
        shacl_graph=_shapes(topik),
        inference="rdfs",
        abort_on_first=False,
    )
    return bool(conform), results_text
