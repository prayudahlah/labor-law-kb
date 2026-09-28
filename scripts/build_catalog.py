#!/usr/bin/env python3
"""Hasilkan catalog-v001.xml dan ontology.ttl untuk membuka KB di Protege.

Protege tidak bisa me-resolve owl:imports ke IRI https://example.org/... yang
tidak dapat diakses. Solusinya dua berkas:

  ontology/catalog-v001.xml  memetakan IRI ontology -> berkas .ttl lokal
  ontology/ontology.ttl      ontology top-level yang mengimpor semua modul KB

Modul knowledge = core/*.ttl + meta/*.ttl + regulasi/*.ttl.
examples/ sengaja dikecualikan agar KB bersih dari fixture uji.

Berkas keluaran deterministik. Jalankan ulang setiap kali modul berubah:
  .venv/bin/python scripts/build_catalog.py
Lalu buka ontology/ontology.ttl di Protege.
"""

from __future__ import annotations

import sys
from pathlib import Path

import rdflib

ROOT = Path(__file__).resolve().parent.parent
ONTO = ROOT / "ontology"
TOP_IRI = "https://example.org/kbr/ketenagakerjaan/kb"
HEADER = (
    "<!-- BERKAS DIGENERATE. JANGAN EDIT MANUAL.\n"
    "     Hasilkan: .venv/bin/python scripts/build_catalog.py -->\n"
)


def modul() -> list[Path]:
    files: list[Path] = []
    for sub in ("core", "meta", "regulasi"):
        files += sorted(ONTO.glob(f"{sub}/*.ttl"))
    return files


def iri_ontology(path: Path) -> str:
    g = rdflib.Graph()
    g.parse(path, format="turtle")
    iris = sorted(str(s) for s in g.subjects(rdflib.RDF.type, rdflib.OWL.Ontology))
    if not iris:
        raise ValueError(f"tidak menemukan owl:Ontology di {path}")
    return iris[0]


def main() -> int:
    files = modul()
    if not files:
        print("[GAGAL] tidak ada modul .ttl", file=sys.stderr)
        return 1

    peta = [(iri_ontology(f), f.relative_to(ONTO).as_posix()) for f in files]
    peta.sort(key=lambda x: x[0])

    # catalog-v001.xml
    baris = [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        HEADER.rstrip("\n"),
        '<catalog prefer="public" xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">',
        f'    <uri id="kb" name="{TOP_IRI}" uri="ontology.ttl"/>',
    ]
    for iri, rel in peta:
        baris.append(f'    <uri id="{rel}" name="{iri}" uri="{rel}"/>')
    baris.append("</catalog>")
    (ONTO / "catalog-v001.xml").write_text("\n".join(baris) + "\n", encoding="utf-8")
    print(f"[tulis] {(ONTO / 'catalog-v001.xml').relative_to(ROOT)}")

    # ontology.ttl (top-level, impor semua modul KB)
    impor = "\n".join(f"    owl:imports <{iri}> ;" for iri, _ in peta)
    impor = impor.rstrip(" ;") + " ."
    isi = (
        "# BERKAS DIGENERATE. JANGAN EDIT MANUAL.\n"
        "# Hasilkan: .venv/bin/python scripts/build_catalog.py\n"
        "# Buka berkas ini di Protege; import diselesaikan lewat catalog-v001.xml.\n\n"
        "@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n"
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n"
        "@prefix dct:  <http://purl.org/dc/terms/> .\n\n"
        f"<{TOP_IRI}> a owl:Ontology ;\n"
        '    dct:title "Knowledge Base Hukum Ketenagakerjaan Indonesia" ;\n'
        f"{impor}\n"
    )
    (ONTO / "ontology.ttl").write_text(isi, encoding="utf-8")
    print(f"[tulis] {(ONTO / 'ontology.ttl').relative_to(ROOT)}")

    print(f"\nSelesai. {len(peta)} modul KB dipetakan.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
