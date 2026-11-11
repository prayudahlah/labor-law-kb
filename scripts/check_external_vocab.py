#!/usr/bin/env python3
"""Verifikasi kosakata eksternal yang dipakai ontology.

Mode offline (default):
  - memastikan deklarasi stub di `ontology/core/external.rdf` lengkap.

Mode online (`--online`):
  - mengambil dokumen resmi FOAF/ELI/Dublin Core,
  - memastikan term yang dipakai benar-benar ada.

Jalankan:
  uv run python scripts/check_external_vocab.py
  uv run python scripts/check_external_vocab.py --online
"""

from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path

import rdflib
from rdflib.namespace import OWL, RDF

ROOT = Path(__file__).resolve().parent.parent
EXTERNAL = ROOT / "ontology" / "core" / "external.rdf"

FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/")
ELI = rdflib.Namespace("http://data.europa.eu/eli/ontology#")
DCT = rdflib.Namespace("http://purl.org/dc/terms/")

FOAF_SPEC = "https://xmlns.com/foaf/spec/index.rdf"
ELI_SPEC = "https://data.europa.eu/eli/ontology"
DCT_TERMS = "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/"

SUMBER = {
    "FOAF": "https://xmlns.com/foaf/spec/",
    "ELI": "https://op.europa.eu/en/web/eu-vocabularies/eli",
    "Dublin Core Terms": DCT_TERMS,
}


def cek_lokal() -> list[str]:
    """Cek deklarasi stub di external.rdf (tanpa jaringan)."""
    galat: list[str] = []
    if not EXTERNAL.exists():
        return [f"berkas tidak ditemukan: {EXTERNAL.relative_to(ROOT)}"]

    g = rdflib.Graph()
    g.parse(EXTERNAL, format="xml")

    wajib_kelas = [FOAF.Agent, FOAF.Person, FOAF.Organization, ELI.LegalResource]
    for term in wajib_kelas:
        if (term, RDF.type, OWL.Class) not in g:
            galat.append(f"deklarasi kelas hilang: {term}")

    wajib_objek = [ELI.amends, ELI.amended_by]
    for term in wajib_objek:
        if (term, RDF.type, OWL.ObjectProperty) not in g:
            galat.append(f"deklarasi object property hilang: {term}")

    if (DCT.identifier, RDF.type, OWL.AnnotationProperty) not in g:
        galat.append(f"deklarasi annotation property hilang: {DCT.identifier}")

    return galat


def ambil(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "labor-law-kb/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def cek_online() -> list[str]:
    """Cek term di dokumen resmi (butuh jaringan)."""
    galat: list[str] = []

    try:
        foaf = rdflib.Graph()
        foaf.parse(data=ambil(FOAF_SPEC), format="xml")
        for term in (FOAF.Agent, FOAF.Person, FOAF.Organization):
            if (term, RDF.type, OWL.Class) not in foaf and (term, RDF.type, rdflib.RDFS.Class) not in foaf:
                galat.append(f"FOAF tidak memuat kelas: {term}")
    except Exception as exc:  # noqa: BLE001 - laporkan sumber yang gagal
        galat.append(f"FOAF tidak dapat diakses ({FOAF_SPEC}): {exc}")

    try:
        eli = rdflib.Graph()
        eli.parse(data=ambil(ELI_SPEC), format="xml")
        if (ELI.LegalResource, RDF.type, OWL.Class) not in eli:
            galat.append(f"ELI tidak memuat kelas: {ELI.LegalResource}")
        for term in (ELI.amends, ELI.amended_by):
            if (term, RDF.type, OWL.ObjectProperty) not in eli:
                galat.append(f"ELI tidak memuat object property: {term}")
    except Exception as exc:  # noqa: BLE001 - laporkan sumber yang gagal
        galat.append(f"ELI tidak dapat diakses ({ELI_SPEC}): {exc}")

    for nama, url in (
        ("dct:identifier", f"{DCT_TERMS}terms/identifier/"),
        ("dct:source", f"{DCT_TERMS}terms/source/"),
    ):
        try:
            ambil(url)
        except Exception as exc:  # noqa: BLE001 - laporkan URL yang gagal
            galat.append(f"{nama} tidak dapat diakses ({url}): {exc}")

    return galat


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--online",
        action="store_true",
        help="verifikasi juga dokumen resmi FOAF/ELI/Dublin Core",
    )
    args = parser.parse_args()

    print("[kosakata eksternal]")
    for nama, url in SUMBER.items():
        print(f"  {nama:18s} {url}")

    galat = cek_lokal()
    if args.online:
        galat += cek_online()
    else:
        print("  (mode offline; tambahkan --online untuk cek dokumen resmi)")

    if galat:
        print("\n[GAGAL]")
        for item in galat:
            print(f"  - {item}")
        return 1
    print("\n[OK] deklarasi dan term eksternal valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
