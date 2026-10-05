#!/usr/bin/env python3
"""Kompilasi Extraction Record (JSON) -> CSV kanonik di data/.

Deterministik: record yang sudah di-commit selalu menghasilkan CSV identik
(urutan tetap + format angka kanonik). Hanya record berstatus `reviewed`
yang dikompilasi.

Hanya menjalankan penulisan bila validasi bersih (memanggil validator).

Jalankan:
  python scripts/compile_extraction.py
  python scripts/compile_extraction.py --only PP-35-2021
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from extraction_common import DATA, angka, daftar_record, baca_json, load_vocab
from validate_extraction import validasi_record

KOLOM = {
    "regulasi": ["dokumen_id", "judul", "jenis", "nomor", "tahun", "sumber", "status", "diubah_oleh"],
    "norma": ["norm_id", "topik", "dokumen_id", "pasal", "iri_individu", "jenis", "kondisi", "akibat",
              "confidence", "dasar_keyakinan", "bukti", "catatan"],
    "parameter": ["norm_id", "nama", "nilai", "satuan", "jenis", "pasal", "confidence", "dasar_keyakinan", "bukti"],
    "kategori": ["dokumen_id", "tabel_id", "nama_tabel", "min_bulan", "max_bulan", "nilai_bulan",
                 "pasal", "confidence", "dasar_keyakinan", "bukti"],
    "pengali_lembur": ["tabel_id", "dokumen_id", "jenis_hari", "jam_min", "jam_max", "pengali",
                       "pasal", "confidence", "dasar_keyakinan", "bukti"],
    "program_jamsos": ["program_id", "dokumen_id", "nama", "jenis_program", "tarif_pengusaha_persen",
                       "tarif_pekerja_persen", "tarif_total_persen", "tingkat_risiko", "pasal",
                       "confidence", "dasar_keyakinan", "bukti", "catatan"],
}


def tulis_csv(out_dir: Path, nama: str, baris: list[dict]) -> None:
    path = out_dir / f"{nama}.csv"
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=KOLOM[nama], lineterminator="\n")
        w.writeheader()
        for b in baris:
            w.writerow({k: b.get(k, "") for k in KOLOM[nama]})
    print(f"[tulis] {path} ({len(baris)} baris)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="batasi ke dokumen_id tertentu")
    parser.add_argument("--out", default=None, help="direktori keluaran (default: data/)")
    parser.add_argument("--allow-empty", action="store_true", help="izinkan menulis CSV kosong")
    args = parser.parse_args()
    out_dir = Path(args.out).resolve() if args.out else DATA
    out_dir.mkdir(parents=True, exist_ok=True)

    vocab = load_vocab()
    param_meta = vocab["norma"]["parameter"]
    files = daftar_record(args.only)
    if not files:
        print("[kompilasi] tidak ada record. Tidak ada yang ditulis.")
        return 0

    semua_error = []
    direview = []
    dilewati = []
    for path in files:
        rec = baca_json(path)
        if rec.get("status_review") != "reviewed":
            dilewati.append(path.stem)
            continue
        err, _ = validasi_record(rec, vocab)
        if err:
            semua_error.append((path.name, err))
        else:
            direview.append(rec)

    if semua_error:
        print("[kompilasi] GAGAL: perbaiki error validasi dulu:", file=sys.stderr)
        for nama, errs in semua_error:
            for e in errs:
                print(f"  [{nama}] {e}", file=sys.stderr)
        return 1

    if dilewati:
        print(f"[kompilasi] dilewati (belum reviewed): {', '.join(sorted(dilewati))}")

    if not direview and not args.allow_empty:
        print("[kompilasi] tidak ada record berstatus 'reviewed'. Gunakan --allow-empty bila memang kosong.")
        return 0

    regulasi, norma, parameter, kategori, pengali, program = [], [], [], [], [], []
    for rec in direview:
        dok = rec["dokumen_id"]
        p = rec["peraturan"]
        regulasi.append({
            "dokumen_id": dok, "judul": p["judul"], "jenis": p["jenis"], "nomor": p["nomor"],
            "tahun": p["tahun"], "sumber": p["sumber"], "status": p["status"],
            "diubah_oleh": ";".join(p.get("diubah_oleh", []) or []),
        })
        for n in rec.get("norma", []) or []:
            norma.append({
                "norm_id": n["norm_id"], "topik": n["topik"], "dokumen_id": dok, "pasal": n["pasal"],
                "iri_individu": n["iri_individu"], "jenis": n["jenis"], "kondisi": n["kondisi"],
                "akibat": n["akibat"], "confidence": angka(n["confidence"]),
                "dasar_keyakinan": n["dasar_keyakinan"], "bukti": n.get("bukti", ""),
                "catatan": n.get("catatan", "") or "-",
            })
            for par in n.get("parameter", []) or []:
                meta = param_meta.get(par["nama"], {})
                parameter.append({
                    "norm_id": n["norm_id"], "nama": par["nama"], "nilai": angka(par["nilai"]),
                    "satuan": par.get("satuan") or meta.get("satuan", ""),
                    "jenis": par.get("jenis") or meta.get("jenis", ""),
                    "pasal": par.get("pasal", "") or n["pasal"],
                    "confidence": angka(n["confidence"]), "dasar_keyakinan": n["dasar_keyakinan"],
                    "bukti": par.get("bukti", ""),
                })
        for k in rec.get("kategori", []) or []:
            kategori.append({
                "dokumen_id": dok, "tabel_id": k["tabel_id"], "nama_tabel": k["nama_tabel"],
                "min_bulan": int(k["min_bulan"]),
                "max_bulan": "" if k.get("max_bulan") is None else int(k["max_bulan"]),
                "nilai_bulan": angka(k["nilai_bulan"]), "pasal": k["pasal"],
                "confidence": angka(k["confidence"]), "dasar_keyakinan": k["dasar_keyakinan"],
                "bukti": k.get("bukti", ""),
            })
        for g in rec.get("pengali_lembur", []) or []:
            pengali.append({
                "tabel_id": g["tabel_id"], "dokumen_id": dok, "jenis_hari": g["jenis_hari"],
                "jam_min": int(g["jam_min"]), "jam_max": int(g["jam_max"]),
                "pengali": angka(g["pengali"]), "pasal": g["pasal"],
                "confidence": angka(g["confidence"]), "dasar_keyakinan": g["dasar_keyakinan"],
                "bukti": g.get("bukti", ""),
            })
        for pr in rec.get("program_jamsos", []) or []:
            program.append({
                "program_id": pr["program_id"], "dokumen_id": dok, "nama": pr["nama"],
                "jenis_program": pr["jenis_program"],
                "tarif_pengusaha_persen": angka(pr["tarif_pengusaha_persen"]),
                "tarif_pekerja_persen": angka(pr["tarif_pekerja_persen"]),
                "tarif_total_persen": angka(pr["tarif_total_persen"]),
                "tingkat_risiko": pr.get("tingkat_risiko") or "", "pasal": pr["pasal"],
                "confidence": angka(pr["confidence"]), "dasar_keyakinan": pr["dasar_keyakinan"],
                "bukti": pr.get("bukti", ""), "catatan": pr.get("catatan", ""),
            })

    regulasi.sort(key=lambda r: r["dokumen_id"])
    norma.sort(key=lambda r: (r["dokumen_id"], r["norm_id"]))
    parameter.sort(key=lambda r: (r["norm_id"], r["nama"]))
    kategori.sort(key=lambda r: (r["dokumen_id"], r["nama_tabel"], r["min_bulan"]))
    pengali.sort(key=lambda r: (r["dokumen_id"], r["jenis_hari"], r["jam_min"]))
    program.sort(key=lambda r: (r["dokumen_id"], r["jenis_program"], r["tingkat_risiko"], r["program_id"]))

    tulis_csv(out_dir, "regulasi", regulasi)
    tulis_csv(out_dir, "norma", norma)
    tulis_csv(out_dir, "parameter", parameter)
    tulis_csv(out_dir, "kategori", kategori)
    tulis_csv(out_dir, "pengali_lembur", pengali)
    tulis_csv(out_dir, "program_jamsos", program)
    print(f"\nSelesai. {len(direview)} record direview, {len(norma)} norma.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
