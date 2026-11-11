#!/usr/bin/env python3
"""Unikkan norm_id/iri_individu/tabel_id/program_id lintas record.

Deterministik: record diproses urut `dokumen_id`. Yang bentrok diberi akhiran
dari dokumen asal (mis. `JAMSOS-MANFAAT-JKK` -> `...-UU402004`,
`ktn:ManfaatJKK` -> `ktn:ManfaatJKKUu402004`). Idempoten.

  python scripts/extract_dedupe.py
"""

from __future__ import annotations

import json

import rdflib
from rdflib.namespace import OWL, RDF

from extraction_common import EXTRACT, RECORDS_DIR, ROOT, baca_json

KTN = "https://example.org/kbr/ketenagakerjaan#"


def kelas_tbox() -> set[str]:
    g = rdflib.Graph()
    for f in sorted((ROOT / "ontology" / "core").glob("*.rdf")):
        g.parse(f, format="xml")
    return {str(s).replace(KTN, "") for s in g.subjects(RDF.type, OWL.Class)}


def akhiran(dok: str) -> str:
    return "".join(c for c in dok.upper() if c.isalnum())


def main() -> int:
    nid: set[str] = set()
    iri: set[str] = set()
    tid: set[str] = set()
    pid: set[str] = set()
    diubah = 0
    kelas = kelas_tbox()

    files = sorted(RECORDS_DIR.glob("*.json"), key=lambda p: p.stem)
    for path in files:
        rec = baca_json(path)
        dok = rec["dokumen_id"]
        suf = akhiran(dok)
        berubah = False

        for n in rec.get("norma", []) or []:
            v = str(n.get("norm_id", ""))
            if v in nid:
                baru, i = f"{v}-{suf}", 2
                while baru in nid:
                    baru = f"{v}-{suf}-{i}"
                    i += 1
                n["norm_id"] = baru
                print(f"  norm_id {dok}: {v} -> {baru}")
                berubah = True
                v = baru
            nid.add(v)

            u = str(n.get("iri_individu", ""))
            lokal = u.replace("ktn:", "")
            if lokal in kelas:
                baru = f"{lokal}Norma"
                i = 2
                while f"ktn:{baru}" in iri:
                    baru = f"{lokal}Norma{i}"
                    i += 1
                u = f"ktn:{baru}"
                n["iri_individu"] = u
                print(f"  iri {dok}: bentrok kelas -> {u}")
                berubah = True

            if u in iri:
                dasar = u
                baru, i = f"{dasar}{suf.title()}", 2
                while baru in iri:
                    baru = f"{dasar}{suf.title()}{i}"
                    i += 1
                n["iri_individu"] = baru
                print(f"  iri {dok}: {u} -> {baru}")
                berubah = True
                u = baru
            iri.add(u)

        for k in rec.get("kategori", []) or []:
            v = str(k.get("tabel_id", ""))
            if v in tid:
                baru, i = f"{v}-{suf}", 2
                while baru in tid:
                    baru = f"{v}-{suf}-{i}"
                    i += 1
                k["tabel_id"] = baru
                berubah = True
                v = baru
            tid.add(v)

        for p in rec.get("program_jamsos", []) or []:
            v = str(p.get("program_id", ""))
            if v in pid:
                baru, i = f"{v}-{suf}", 2
                while baru in pid:
                    baru = f"{v}-{suf}-{i}"
                    i += 1
                p["program_id"] = baru
                berubah = True
                v = baru
            pid.add(v)

        if berubah:
            path.write_text(json.dumps(rec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            diubah += 1

    print(f"\nSelesai. {len(files)} record dipindai, {diubah} diperbarui.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
