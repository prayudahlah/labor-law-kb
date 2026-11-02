#!/usr/bin/env python3
"""Periksa DL expressivity ontology inti (read-only).

Menghitung huruf fitur yang benar-benar dipakai di `ontology/core/*.ttl`
dan memastikan konstruktor nominal (O) serta qualified cardinality (Q) ada,
sehingga expressivity mencapai SROIQ(D).

  python scripts/check_expressivity.py
"""

from __future__ import annotations

import glob
from pathlib import Path

import rdflib
from rdflib.namespace import OWL, RDF, RDFS

ROOT = Path(__file__).resolve().parent.parent
CORE = sorted((ROOT / "ontology" / "core").glob("*.ttl"))


def main() -> int:
    g = rdflib.Graph()
    for f in CORE:
        g.parse(f, format="turtle")

    def ada(pred) -> bool:
        return next(g.triples((None, pred, None)), None) is not None

    def tipe(t) -> bool:
        return next(g.triples((None, RDF.type, t)), None) is not None

    fitur = {
        "S": tipe(OWL.TransitiveProperty),
        "H": ada(RDFS.subPropertyOf),
        "R": ada(OWL.propertyChainAxiom),
        "O": ada(OWL.oneOf),
        "I": ada(OWL.inverseOf),
        "F": tipe(OWL.FunctionalProperty),
        "Q": ada(OWL.qualifiedCardinality)
        or ada(OWL.minQualifiedCardinality)
        or ada(OWL.maxQualifiedCardinality),
        "N": ada(OWL.minCardinality) or ada(OWL.maxCardinality) or ada(OWL.cardinality),
        "D": tipe(OWL.DatatypeProperty) or ada(OWL.withRestrictions),
    }

    urutan = ["S", "R", "O", "I", "Q", "N"]
    inti = "".join(h for h in urutan if fitur[h]) or "ALC"
    label = inti + ("(D)" if fitur["D"] else "")
    ekstra = ", ".join(h for h in ("H", "F") if fitur[h])

    print(f"Modul dipindai : {len(CORE)}")
    print(f"Fitur          : {', '.join(h for h in 'SHROIFQND' if fitur[h])}")
    print(f"DL expressivity: {label}" + (f"  (+ {ekstra})" if ekstra else ""))

    wajib = ["S", "R", "O", "I", "Q", "D"]
    kurang = [h for h in wajib if not fitur[h]]
    if kurang:
        print(f"[GAGAL] fitur belum ada untuk SROIQ(D): {', '.join(kurang)}")
        return 1
    print("[OK] memenuhi SROIQ(D)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
