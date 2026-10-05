#!/usr/bin/env python3
"""Validasi Extraction Record terhadap SPEC, VOCAB, dan cakupan markdown.

Menegakkan kontrak yang sama dengan data/extraction/schema/extraction.schema.json
(tanpa dependensi jsonschema, agar bisa dijalankan dengan pustaka standar).

Cek:
  - struktur & field wajib, tipe, pola penamaan
  - enum terhadap VOCAB.yaml
  - rentang numerik (confidence, min/max bulan, jam)
  - evidensi (bukti) untuk norma
  - keunikan lintas record (norm_id, iri_individu, tabel_id, program_id, dokumen_id)
  - rujukan amandemen
  - cakupan pasal vs heading markdown (memotong di PENJELASAN)

Jalankan:
  python scripts/validate_extraction.py
  python scripts/validate_extraction.py --only PP-35-2021
  python scripts/validate_extraction.py --strict     # warning dianggap error
"""

from __future__ import annotations

import argparse
import re
import sys

from extraction_common import (
    angka,
    baca_json,
    body_pasal,
    daftar_record,
    load_vocab,
    pasal_ref,
)


def wujud(v) -> str:
    return type(v).__name__


def cek_angka_positif_atas(nilai, nama, errors):
    if isinstance(nilai, bool) or not isinstance(nilai, (int, float)):
        errors.append(f"{nama}: harus angka, dapat {wujud(nilai)}")
        return None
    return nilai


def validasi_record(rec: dict, vocab: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    dok = rec.get("dokumen_id", "?")

    def err(msg):
        errors.append(f"[{dok}] {msg}")

    def warn(msg):
        warnings.append(f"[{dok}] {msg}")

    norma_jenis = set(vocab["norma"]["jenis"])
    topik_set = set(vocab["norma"].get("topik", []))
    param_meta = vocab["norma"]["parameter"]
    conf_lo = vocab["norma"]["confidence"]["min"]
    conf_hi = vocab["norma"]["confidence"]["max"]
    pola = vocab.get("pola", {})
    DASAR = set(vocab["norma"]["dasar_keyakinan"])
    JENIS_HARI = set(vocab["pengali_lembur"]["jenis_hari"])
    PROGRAM = set(vocab["program_jamsos"]["jenis_program"])
    NAMA_TABEL = set(vocab["kategori"]["nama_tabel"])

    # --- field wajib tingkat atas ---
    for key in ("spec_version", "vocab_version", "dokumen_id", "status_review", "peraturan", "norma", "cakupan"):
        if key not in rec:
            err(f"field wajib hilang: {key}")
    if errors:
        return errors, warnings

    # SPEC_MAJOR = versi mayor yang didukung SPEC saat ini.
    SPEC_MAJOR = "1"
    major = str(rec["spec_version"]).split(".")[0]
    if major != SPEC_MAJOR:
        warn(f"spec_version='{rec['spec_version']}' beda mayor dengan SPEC ({SPEC_MAJOR}.x)")

    if rec["status_review"] not in ("draft", "reviewed"):
        err(f"status_review tidak valid: {rec['status_review']}")

    if not re.match(pola.get("dokumen_id", r".+"), dok):
        err(f"dokumen_id tidak sesuai pola: {dok}")

    # --- peraturan ---
    p = rec["peraturan"]
    if not isinstance(p, dict):
        err("peraturan harus objek")
    else:
        for key in ("judul", "jenis", "nomor", "tahun", "sumber", "status"):
            if key not in p:
                err(f"peraturan.{key} wajib")
        if p.get("jenis") not in vocab["jenis_peraturan"]:
            err(f"peraturan.jenis tidak dikenal: {p.get('jenis')}")
        if p.get("status") not in vocab["status_hukum"]:
            err(f"peraturan.status tidak dikenal: {p.get('status')}")
        if not re.match(r"^\d{4}$", str(p.get("tahun", ""))):
            err(f"peraturan.tahun harus 4 digit: {p.get('tahun')}")
        if not str(p.get("sumber", "")).startswith("http"):
            err(f"peraturan.sumber harus URL: {p.get('sumber')}")
        for target in p.get("diubah_oleh", []) or []:
            if not re.match(pola.get("dokumen_id", r".+"), target):
                err(f"peraturan.diubah_oleh bukan dokumen_id valid: {target}")

    # --- norma ---
    norm_ids = set()
    for i, n in enumerate(rec["norma"]):
        tag = f"norma[{i}]"
        if not isinstance(n, dict):
            err(f"{tag} harus objek")
            continue
        for key in ("norm_id", "topik", "pasal", "iri_individu", "jenis", "kondisi", "akibat", "bukti", "confidence", "dasar_keyakinan"):
            if key not in n:
                err(f"{tag}.{key} wajib")
        nid = n.get("norm_id", "")
        if not re.match(pola.get("norm_id", r".+"), nid):
            err(f"{tag}.norm_id tidak sesuai pola: {nid}")
        if nid in norm_ids:
            err(f"{tag}.norm_id duplikat dalam record: {nid}")
        norm_ids.add(nid)
        iri = n.get("iri_individu", "")
        if not re.match(pola.get("iri_individu", r".+"), iri):
            err(f"{tag}.iri_individu tidak sesuai pola: {iri}")
        if n.get("jenis") not in norma_jenis:
            err(f"{tag}.jenis tidak dikenal: {n.get('jenis')}")
        if n.get("topik") not in topik_set:
            warn(f"{tag}.topik di luar daftar himbauan: {n.get('topik')}")
        if not str(n.get("bukti", "")).strip():
            err(f"{tag}.bukti kosong (evidensi wajib)")
        if not pasal_ref(str(n.get("pasal", ""))):
            err(f"{tag}.pasal tidak valid: {n.get('pasal')}")
        c = n.get("confidence")
        if isinstance(c, bool) or not isinstance(c, (int, float)) or not (conf_lo <= c <= conf_hi):
            err(f"{tag}.confidence di luar [{conf_lo},{conf_hi}]: {c}")
        if n.get("dasar_keyakinan") not in DASAR:
            err(f"{tag}.dasar_keyakinan tidak dikenal: {n.get('dasar_keyakinan')}")
        for j, par in enumerate(n.get("parameter", []) or []):
            ptag = f"{tag}.parameter[{j}]"
            nama = par.get("nama")
            if nama not in param_meta:
                err(f"{ptag}.nama tidak dikenal: {nama}")
            nilai = par.get("nilai")
            if not re.match(r"^-?\d+(\.\d+)?$", str(nilai)):
                err(f"{ptag}.nilai bukan numerik: {nilai}")
            else:
                try:
                    angka(str(nilai))
                except ValueError:
                    err(f"{ptag}.nilai tidak bisa diparse: {nilai}")
            if not par.get("pasal"):
                warn(f"{ptag}.pasal kosong")

    # --- kategori ---
    for i, k in enumerate(rec.get("kategori", []) or []):
        tag = f"kategori[{i}]"
        if k.get("nama_tabel") not in NAMA_TABEL:
            err(f"{tag}.nama_tabel tidak dikenal: {k.get('nama_tabel')}")
        if not re.match(pola.get("tabel_id", r".+"), str(k.get("tabel_id", ""))):
            err(f"{tag}.tabel_id tidak sesuai pola: {k.get('tabel_id')}")
        lo = k.get("min_bulan")
        hi = k.get("max_bulan")
        if lo is None:
            err(f"{tag}.min_bulan wajib")
        if hi is not None and isinstance(lo, int) and hi < lo:
            err(f"{tag}: max_bulan < min_bulan")
        if not str(k.get("pasal", "")):
            err(f"{tag}.pasal wajib")
        c = k.get("confidence")
        if isinstance(c, bool) or not isinstance(c, (int, float)):
            err(f"{tag}.confidence wajib angka")
        if k.get("dasar_keyakinan") not in DASAR:
            err(f"{tag}.dasar_keyakinan tidak dikenal: {k.get('dasar_keyakinan')}")

    # --- pengali lembur ---
    for i, g in enumerate(rec.get("pengali_lembur", []) or []):
        tag = f"pengali_lembur[{i}]"
        if g.get("jenis_hari") not in JENIS_HARI:
            err(f"{tag}.jenis_hari tidak dikenal: {g.get('jenis_hari')}")
        if not re.match(pola.get("tabel_id", r".+"), str(g.get("tabel_id", ""))):
            err(f"{tag}.tabel_id tidak sesuai pola: {g.get('tabel_id')}")
        jmin, jmax = g.get("jam_min"), g.get("jam_max")
        if isinstance(jmin, int) and isinstance(jmax, int) and jmin > jmax:
            err(f"{tag}: jam_min > jam_max")
        if not str(g.get("pasal", "")):
            err(f"{tag}.pasal wajib")
        if g.get("dasar_keyakinan") not in DASAR:
            err(f"{tag}.dasar_keyakinan tidak dikenal: {g.get('dasar_keyakinan')}")

    # --- program jamsos ---
    for i, pr in enumerate(rec.get("program_jamsos", []) or []):
        tag = f"program_jamsos[{i}]"
        if pr.get("jenis_program") not in PROGRAM:
            err(f"{tag}.jenis_program tidak dikenal: {pr.get('jenis_program')}")
        if not re.match(pola.get("program_id", r".+"), str(pr.get("program_id", ""))):
            err(f"{tag}.program_id tidak sesuai pola: {pr.get('program_id')}")
        for fld in ("tarif_pengusaha_persen", "tarif_pekerja_persen", "tarif_total_persen"):
            if not isinstance(pr.get(fld), (int, float)) or isinstance(pr.get(fld), bool):
                err(f"{tag}.{fld} wajib angka")
        if not str(pr.get("pasal", "")):
            err(f"{tag}.pasal wajib")
        if pr.get("dasar_keyakinan") not in DASAR:
            err(f"{tag}.dasar_keyakinan tidak dikenal: {pr.get('dasar_keyakinan')}")

    # --- cakupan ---
    cak = rec.get("cakupan", {})
    if not isinstance(cak, dict):
        err("cakupan harus objek")
    else:
        if "pasal_diekstrak" not in cak or "pasal_dilewati" not in cak:
            err("cakupan.pasal_diekstrak & cakupan.pasal_dilewati wajib")
        else:
            body = body_pasal(dok, loose=True)
            body_set = set(body)
            dideklarasi: set[str] = set()
            for x in cak.get("pasal_diekstrak", []) or []:
                ref = pasal_ref(str(x))
                if not ref:
                    err(f"cakupan.pasal_diekstrak tidak valid: {x}")
                else:
                    dideklarasi.add(ref)
            for item in cak.get("pasal_dilewati", []) or []:
                ref = pasal_ref(str(item.get("pasal", "")))
                if not ref:
                    err(f"cakupan.pasal_dilewati.pasal tidak valid: {item.get('pasal')}")
                    continue
                dideklarasi.add(ref)
                if not str(item.get("alasan", "")).strip():
                    err(f"cakupan.pasal_dilewati '{ref}' tanpa alasan")
            for item in rec.get("tidak_termodelkan", []) or []:
                ref = pasal_ref(str(item.get("pasal", "")))
                if not ref:
                    err(f"tidak_termodelkan.pasal tidak valid: {item.get('pasal')}")
                else:
                    dideklarasi.add(ref)

            if not body:
                warn("markdown tidak ditemukan / tanpa heading pasal; cakupan tak bisa diuji")
            else:
                for ref in sorted(dideklarasi - body_set, key=lambda s: (len(s), s)):
                    warn(f"cakupan menyebut '{ref}' tanpa heading batang tubuh (kemungkinan gap/OCR markdown)")
                sisa = body_set - dideklarasi
                if sisa:
                    pesan = f"{len(sisa)} pasal batang tubuh belum dicatat: {', '.join(sorted(sisa, key=lambda s: (len(s), s)))}"
                    if cak.get("lengkap"):
                        err(pesan + " (cakupan.lengkap=true)")
                    else:
                        warn(pesan)

            # konsistensi: pasal norma harus ada di pasal_diekstrak
            for n in rec["norma"]:
                ref = pasal_ref(str(n.get("pasal", "")))
                if ref and ref not in {pasal_ref(x) for x in cak.get("pasal_diekstrak", []) or []}:
                    warn(f"pasal norma {ref} ({n.get('norm_id')}) tak tercantum di cakupan.pasal_diekstrak")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="batasi ke dokumen_id tertentu")
    parser.add_argument("--strict", action="store_true", help="warning dianggap error")
    args = parser.parse_args()

    vocab = load_vocab()
    files = daftar_record(args.only)
    if not files:
        print("[validasi] tidak ada record untuk divalidasi.")
        return 0

    semua_errors: list[str] = []
    semua_warnings: list[str] = []
    norm_ids: dict[str, str] = {}
    iris: dict[str, str] = {}
    tabel_ids: dict[str, str] = {}
    program_ids: dict[str, str] = {}
    dokumen_ids: dict[str, str] = {}
    diubah_target: set[str] = set()
    dokumen_set: set[str] = set()

    records = []
    for path in files:
        rec = baca_json(path)
        records.append((path, rec))
        dokumen_set.add(rec.get("dokumen_id", path.stem))

    for path, rec in records:
        errors, warnings = validasi_record(rec, vocab)
        dok = rec.get("dokumen_id", path.stem)
        if dok in dokumen_ids:
            errors.append(f"[{dok}] dokumen_id duplikat antar record")
        dokumen_ids[dok] = path.name

        for n in rec.get("norma", []) or []:
            nid = n.get("norm_id")
            if nid in norm_ids:
                errors.append(f"[{dok}] norm_id '{nid}' juga dipakai di {norm_ids[nid]}")
            elif nid:
                norm_ids[nid] = path.name
            iri = n.get("iri_individu")
            if iri in iris:
                errors.append(f"[{dok}] iri_individu '{iri}' juga dipakai di {iris[iri]}")
            elif iri:
                iris[iri] = path.name
        for k in rec.get("kategori", []) or []:
            tid = k.get("tabel_id")
            if tid in tabel_ids:
                errors.append(f"[{dok}] tabel_id '{tid}' juga dipakai di {tabel_ids[tid]}")
            elif tid:
                tabel_ids[tid] = path.name
        for pr in rec.get("program_jamsos", []) or []:
            pid = pr.get("program_id")
            if pid in program_ids:
                errors.append(f"[{dok}] program_id '{pid}' juga dipakai di {program_ids[pid]}")
            elif pid:
                program_ids[pid] = path.name
        for t in (rec.get("peraturan", {}) or {}).get("diubah_oleh", []) or []:
            diubah_target.add(t)

        semua_errors.extend(errors)
        semua_warnings.extend(warnings)

    # rujukan amandemen
    for target in sorted(diubah_target - dokumen_set):
        semua_warnings.append(f"[global] diubah_oleh menunjuk '{target}' yang belum punya record")

    print(f"[validasi] {len(files)} record, {len(norm_ids)} norma, {len(tabel_ids)} tabel, "
          f"{len(program_ids)} program")
    for w in semua_warnings:
        print(f"  [peringatan] {w}")
    for e in semua_errors:
        print(f"  [GAGAL] {e}", file=sys.stderr)

    print()
    if semua_errors or (args.strict and semua_warnings):
        print(f"HASIL: GAGAL — {len(semua_errors)} error, {len(semua_warnings)} peringatan")
        return 1
    print(f"HASIL: LOLOS — 0 error, {len(semua_warnings)} peringatan")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
