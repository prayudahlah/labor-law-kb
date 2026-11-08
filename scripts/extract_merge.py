#!/usr/bin/env python3
"""Gabungkan fragmen chunk -> satu Extraction Record, validasi, auto-promote.

Aturan promotasi (ketat): record menjadi `reviewed` hanya bila
  - validator melaporkan 0 error, DAN
  - seluruh pasal batang tubuh tercatat (tidak ada yang hilang).
Selain itu tetap `draft` (tidak akan dikompilasi).

  python scripts/extract_merge.py --only PP-83-2013
  python scripts/extract_merge.py            # semua yang fragmennya lengkap
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from extraction_common import EXTRACT, ROOT, baca_json, body_pasal, load_vocab, pasal_ref
from validate_extraction import validasi_record

WORK = EXTRACT / "work"
RECORDS = EXTRACT / "records"
SPEC_VERSION = "1.1.0"


def bersih(x) -> str:
    return "" if x in ("-", None) else str(x)


def gabung(dok: str, manifest: dict) -> dict | None:
    frags = []
    for ch in manifest["chunks"]:
        path = WORK / dok / ch["fragment"]
        if not path.exists():
            return None
        frags.append(baca_json(path))

    norma, kategori, pengali, program = [], [], [], []
    diekstrak: list[str] = []
    dilewati: list[dict] = []
    tidak: list[dict] = []

    for f in frags:
        norma += f.get("norma", []) or []
        kategori += f.get("kategori", []) or []
        pengali += f.get("pengali_lembur", []) or []
        program += f.get("program_jamsos", []) or []
        diekstrak += f.get("pasal_diekstrak", []) or []
        dilewati += f.get("pasal_dilewati", []) or []
        tidak += f.get("tidak_termodelkan", []) or []

    # Pasal yang menghasilkan norma/tabel otomatis dianggap diekstrak.
    for n in norma:
        ref = pasal_ref(n.get("pasal", ""))
        if ref:
            diekstrak.append(ref)
    for k in kategori:
        ref = pasal_ref(k.get("pasal", ""))
        if ref:
            diekstrak.append(ref)
    for g in pengali:
        ref = pasal_ref(g.get("pasal", ""))
        if ref:
            diekstrak.append(ref)
    for p in program:
        ref = pasal_ref(p.get("pasal", ""))
        if ref:
            diekstrak.append(ref)

    # Dedup deterministik.
    def uniq(seq):
        seen, out = set(), []
        for x in seq:
            key = json.dumps(x, sort_keys=True, ensure_ascii=False) if isinstance(x, dict) else x
            if key not in seen:
                seen.add(key)
                out.append(x)
        return out

    diekstrak = uniq([pasal_ref(p) or p for p in diekstrak if p])
    dilewati = uniq(dilewati)
    tidak = uniq(tidak)
    norma = uniq(norma)

    # Unikkan norm_id & iri_individu global (dalam dokumen).
    dipakai_nid: set[str] = set()
    dipakai_iri: set[str] = set()
    for n in norma:
        nid = str(n.get("norm_id", ""))
        iri = str(n.get("iri_individu", ""))
        dasar_nid, i = nid, 2
        while nid in dipakai_nid:
            nid = f"{dasar_nid}-{i}"
            i += 1
        dasar_iri, i = iri, 2
        while iri in dipakai_iri:
            iri = f"{dasar_iri}{i}"
            i += 1
        n["norm_id"], n["iri_individu"] = nid, iri
        dipakai_nid.add(nid)
        dipakai_iri.add(iri)

    body = set(body_pasal(dok))
    tertutup = {pasal_ref(p) for p in diekstrak if pasal_ref(p)}
    tertutup |= {pasal_ref(x.get("pasal", "")) for x in dilewati if pasal_ref(x.get("pasal", ""))}
    tertutup |= {pasal_ref(x.get("pasal", "")) for x in tidak if pasal_ref(x.get("pasal", ""))}
    hilang = body - tertutup

    rec = {
        "spec_version": SPEC_VERSION,
        "vocab_version": load_vocab()["versi"],
        "dokumen_id": dok,
        "status_review": "draft",
        "peraturan": {
            "judul": manifest["judul"],
            "jenis": manifest["jenis"],
            "nomor": manifest["nomor"],
            "tahun": manifest["tahun"],
            "sumber": manifest["sumber"],
            "status": "Berlaku",
            "diubah_oleh": [],
        },
        "norma": norma,
        "kategori": kategori,
        "pengali_lembur": pengali,
        "program_jamsos": program,
        "cakupan": {
            "lengkap": not hilang,
            "pasal_diekstrak": sorted((tertutup & body) if body else tertutup),
            "pasal_dilewati": dilewati,
            "catatan": "" if not hilang else f"{len(hilang)} pasal belum dicatat: {', '.join(sorted(hilang))}",
        },
        "tidak_termodelkan": tidak,
    }
    return rec


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()

    vocab = load_vocab()
    hanya = {x.upper() for x in args.only} if args.only else None
    RECORDS.mkdir(parents=True, exist_ok=True)

    hasil = []
    for man in sorted(WORK.glob("*/manifest.json")):
        dok = man.parent.name
        if hanya and dok.upper() not in hanya:
            continue
        manifest = baca_json(man)
        rec = gabung(dok, manifest)
        if rec is None:
            print(f"  {dok:<16} BELUM LENGKAP (fragmen kurang)")
            hasil.append((dok, "belum_lengkap", 0, 0))
            continue
        errors, _ = validasi_record(rec, vocab)
        if not errors and rec["cakupan"]["lengkap"]:
            rec["status_review"] = "reviewed"
        out = RECORDS / f"{dok}.json"
        out.write_text(json.dumps(rec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  {dok:<16} {rec['status_review']:<9} norma={len(rec['norma']):<4} error={len(errors):<2}")
        for e in errors[:5]:
            print(f"      ! {e}")
        hasil.append((dok, rec["status_review"], len(rec["norma"]), len(errors)))

    n_rev = sum(1 for h in hasil if h[1] == "reviewed")
    print(f"\nSelesai. {len(hasil)} dokumen, {n_rev} reviewed, {len(hasil)-n_rev} draft/belum.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
