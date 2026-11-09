#!/usr/bin/env python3
"""Hasilkan catalog-v001.xml, ontology.rdf, dan test.rdf untuk Protege.

  ontology/catalog-v001.xml  memetakan IRI ontology -> berkas lokal
  ontology/ontology.rdf      top-level KB murni (core, meta, regulasi)
  ontology/test.rdf          top-level KB + golden case (examples/)

Modul manual: core/*.ttl dan examples/*.ttl.
Modul generated: meta/*.rdf dan regulasi/*.rdf.
Tidak ada ontology.ttl/test.ttl; format akhir adalah RDF/XML.

Jalankan: uv run python scripts/build_catalog.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import rdflib

import rdf_io

ROOT = Path(__file__).resolve().parent.parent
ONTO = ROOT / "ontology"
TOP_IRI = "https://example.org/kbr/ketenagakerjaan/kb"
TEST_IRI = "https://example.org/kbr/ketenagakerjaan/test"
HEADER = (
    "<!-- BERKAS DIGENERATE. JANGAN EDIT MANUAL.\n"
    "     Hasilkan: uv run python scripts/build_catalog.py -->\n"
)


def modul() -> list[Path]:
    files: list[Path] = []
    files += sorted(ONTO.glob("core/*.ttl"))
    for sub in ("meta", "regulasi"):
        files += sorted(ONTO.glob(f"{sub}/*.rdf"))
    return files


def contoh() -> list[Path]:
    return sorted(ONTO.glob("examples/*.ttl"))


def iri_ontology(path: Path) -> str:
    g = rdf_io.baca_berkas(path)
    iris = sorted(str(s) for s in g.subjects(rdflib.RDF.type, rdflib.OWL.Ontology))
    if not iris:
        raise ValueError(f"tidak menemukan owl:Ontology di {path}")
    return iris[0]


def peta_iri(files: list[Path]) -> list[tuple[str, str]]:
    return sorted(
        ((iri_ontology(f), f.relative_to(ONTO).as_posix()) for f in files),
        key=lambda x: x[0],
    )


def tulis_toplevel(out: Path, iri: str, judul: str, impor_iris: list[str]) -> None:
    g = rdf_io.graph_toplevel(iri, judul, impor_iris)
    rdf_io.tulis_rdfxml(
        out,
        g,
        rdf_io.header_generate("modul KB (core/meta/regulasi)", "build_catalog.py"),
    )
    print(f"[tulis] {out.relative_to(ROOT)}")


def main() -> int:
    peta = peta_iri(modul())
    if not peta:
        print("[GAGAL] tidak ada modul KB", file=sys.stderr)
        return 1
    peta_contoh = peta_iri(contoh())

    # catalog-v001.xml
    baris = [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        HEADER.rstrip("\n"),
        '<catalog prefer="public" xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">',
        f'    <uri id="kb" name="{TOP_IRI}" uri="ontology.rdf"/>',
        f'    <uri id="test" name="{TEST_IRI}" uri="test.rdf"/>',
    ]
    for iri, rel in peta + peta_contoh:
        baris.append(f'    <uri id="{rel}" name="{iri}" uri="{rel}"/>')
    baris.append("</catalog>")
    (ONTO / "catalog-v001.xml").write_text("\n".join(baris) + "\n", encoding="utf-8")
    print(f"[tulis] {(ONTO / 'catalog-v001.xml').relative_to(ROOT)}")

    # ontology.rdf (KB murni) dan test.rdf (KB + golden case)
    tulis_toplevel(
        ONTO / "ontology.rdf",
        TOP_IRI,
        "Knowledge Base Hukum Ketenagakerjaan Indonesia",
        [iri for iri, _ in peta],
    )
    tulis_toplevel(
        ONTO / "test.rdf",
        TEST_IRI,
        "Knowledge Base + Golden Case (uji)",
        [iri for iri, _ in peta + peta_contoh],
    )

    # Bersihkan top-level TTL lama.
    for stale in (ONTO / "ontology.ttl", ONTO / "test.ttl"):
        if stale.exists():
            stale.unlink()

    print(f"\nSelesai. {len(peta)} modul KB, {len(peta_contoh)} modul contoh.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
