#!/usr/bin/env python3
"""Hasilkan catalog-v001.xml, ontology.ttl, dan test.ttl untuk membuka KB di Protege.

Protege tidak bisa me-resolve owl:imports ke IRI https://example.org/... yang
tidak dapat diakses. Solusinya berkas berikut:

  ontology/catalog-v001.xml  memetakan IRI ontology -> berkas .ttl lokal
  ontology/ontology.ttl      top-level KB murni (core, meta, regulasi)
  ontology/test.ttl          top-level KB + golden case (examples/)

Modul knowledge = core/*.ttl + meta/*.ttl + regulasi/*.ttl.
examples/ hanya masuk ke test.ttl agar KB produksi tetap bersih dari fixture.

Berkas keluaran deterministik. Jalankan ulang setiap kali modul berubah:
  uv run python scripts/build_catalog.py
Lalu buka ontology/ontology.ttl (KB murni) atau ontology/test.ttl (KB + contoh).
"""

from __future__ import annotations

import sys
from pathlib import Path

import rdflib

ROOT = Path(__file__).resolve().parent.parent
ONTO = ROOT / "ontology"
TOP_IRI = "https://example.org/kbr/ketenagakerjaan/kb"
TEST_IRI = "https://example.org/kbr/ketenagakerjaan/test"
HEADER = (
    "<!-- BERKAS DIGENERATE. JANGAN EDIT MANUAL.\n"
    "     Hasilkan: uv run python scripts/build_catalog.py -->\n"
)
PREFIX_BLOK = (
    "@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n"
    "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n"
    "@prefix dct:  <http://purl.org/dc/terms/> .\n\n"
)


def modul() -> list[Path]:
    files: list[Path] = []
    for sub in ("core", "meta", "regulasi"):
        files += sorted(ONTO.glob(f"{sub}/*.ttl"))
    return files


def contoh() -> list[Path]:
    return sorted(ONTO.glob("examples/*.ttl"))


def iri_ontology(path: Path) -> str:
    g = rdflib.Graph()
    g.parse(path, format="turtle")
    iris = sorted(str(s) for s in g.subjects(rdflib.RDF.type, rdflib.OWL.Ontology))
    if not iris:
        raise ValueError(f"tidak menemukan owl:Ontology di {path}")
    return iris[0]


def peta_iri(files: list[Path]) -> list[tuple[str, str]]:
    return sorted(((iri_ontology(f), f.relative_to(ONTO).as_posix()) for f in files), key=lambda x: x[0])


def tulis_toplevel(out: Path, iri: str, judul: str, impor_iris: list[str]) -> None:
    impor = "\n".join(f"    owl:imports <{i}> ;" for i in impor_iris)
    impor = impor.rstrip(" ;") + " ."
    isi = (
        "# BERKAS DIGENERATE. JANGAN EDIT MANUAL.\n"
        "# Hasilkan: uv run python scripts/build_catalog.py\n"
        "# Buka berkas ini di Protege; import diselesaikan lewat catalog-v001.xml.\n\n"
        + PREFIX_BLOK
        + f"<{iri}> a owl:Ontology ;\n"
        + f'    dct:title "{judul}" ;\n'
        + f"{impor}\n"
    )
    out.write_text(isi, encoding="utf-8")
    print(f"[tulis] {out.relative_to(ROOT)}")


def main() -> int:
    peta = peta_iri(modul())
    if not peta:
        print("[GAGAL] tidak ada modul .ttl", file=sys.stderr)
        return 1
    peta_contoh = peta_iri(contoh())

    # catalog-v001.xml
    baris = [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        HEADER.rstrip("\n"),
        '<catalog prefer="public" xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">',
        f'    <uri id="kb" name="{TOP_IRI}" uri="ontology.ttl"/>',
        f'    <uri id="test" name="{TEST_IRI}" uri="test.ttl"/>',
    ]
    for iri, rel in peta + peta_contoh:
        baris.append(f'    <uri id="{rel}" name="{iri}" uri="{rel}"/>')
    baris.append("</catalog>")
    (ONTO / "catalog-v001.xml").write_text("\n".join(baris) + "\n", encoding="utf-8")
    print(f"[tulis] {(ONTO / 'catalog-v001.xml').relative_to(ROOT)}")

    # ontology.ttl (KB murni) dan test.ttl (KB + golden case)
    tulis_toplevel(
        ONTO / "ontology.ttl", TOP_IRI,
        "Knowledge Base Hukum Ketenagakerjaan Indonesia",
        [iri for iri, _ in peta],
    )
    tulis_toplevel(
        ONTO / "test.ttl", TEST_IRI,
        "Knowledge Base + Golden Case (uji)",
        [iri for iri, _ in peta + peta_contoh],
    )

    print(f"\nSelesai. {len(peta)} modul KB, {len(peta_contoh)} modul contoh.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
