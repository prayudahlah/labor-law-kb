#!/usr/bin/env python3
"""Siapkan paket ekstraksi per dokumen: chunk markdown + manifest.

Deterministik. Hasil kerja di data/extraction/work/<DOKUMEN_ID>/.

  manifest.json  metadata + daftar chunk
  chunk-NN.md    potongan teks untuk satu panggilan LLM

Tidak memanggil LLM. Jalankan sebelum subagent ekstraksi.

  python scripts/extract_prepare.py                 # semua dokumen
  python scripts/extract_prepare.py --only PP-83-2013 PP-44-2015
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

from extraction_common import (
    EXTRACT,
    PASAL_LABEL_RE,
    PENJELASAN_RE,
    ROOT,
    _cari_markdown,
)

SOURCES = ROOT / "docs" / "sources.yaml"
WORK = EXTRACT / "work"
STATE = WORK / "state.json"

MAKS_PASAL = 40
MAKS_CHAR = 16000


def muat_sumber() -> dict[str, dict]:
    data = yaml.safe_load(SOURCES.read_text(encoding="utf-8"))
    return {d["id"]: d for d in data["dokumen"]}


def segmen_pasal(teks: str) -> list[tuple[str, str]]:
    """Pecah teks jadi (label, isi). Preamble sebelum pasal pertama dibuang."""
    segmen: list[tuple[str, str]] = []
    label_now: str | None = None
    buf: list[str] = []
    for line in teks.splitlines():
        if PENJELASAN_RE.match(line.strip()):
            break
        m = PASAL_LABEL_RE.match(line.strip())
        if m:
            if label_now is not None:
                segmen.append((label_now, "\n".join(buf).strip()))
            label_now = f"Pasal {m.group(1)}"
            buf = [line]
        elif label_now is not None:
            buf.append(line)
    if label_now is not None:
        segmen.append((label_now, "\n".join(buf).strip()))
    return segmen


def buat_chunk(segmen: list[tuple[str, str]]) -> list[list[tuple[str, str]]]:
    chunks: list[list[tuple[str, str]]] = []
    kini: list[tuple[str, str]] = []
    chars = 0
    for label, isi in segmen:
        panjang = len(isi)
        if kini and (len(kini) >= MAKS_PASAL or chars + panjang > MAKS_CHAR):
            chunks.append(kini)
            kini, chars = [], 0
        kini.append((label, isi))
        chars += panjang
    if kini:
        chunks.append(kini)
    return chunks


def siapkan(dok: str, meta: dict) -> dict:
    path = _cari_markdown(dok)
    if path is None:
        return {"dokumen_id": dok, "status": "tanpa_markdown", "chunk": 0}

    teks = path.read_text(encoding="utf-8")
    segmen = segmen_pasal(teks)
    out_dir = WORK / dok
    out_dir.mkdir(parents=True, exist_ok=True)

    chunks = buat_chunk(segmen)
    manifest_chunks = []
    for i, chunk in enumerate(chunks, start=1):
        nama = f"chunk-{i:02d}.md"
        frag = f"chunk-{i:02d}.json"
        pasal = [lbl for lbl, _ in chunk]
        header = (
            f"# DOKUMEN: {dok} — {meta.get('judul', '')}\n"
            f"# CHUNK: {i}/{len(chunks)}\n"
            f"# PASAL DALAM CHUNK: {'; '.join(pasal)}\n"
            f"# TULIS FRAGMEN KE: data/extraction/work/{dok}/{frag}\n"
            f"# ATURAN: baca data/extraction/CHEATSHEET.md dan data/extraction/VOCAB.yaml\n\n"
        )
        (out_dir / nama).write_text(header + "\n\n".join(isi for _, isi in chunk) + "\n", encoding="utf-8")
        manifest_chunks.append({"index": i, "file": nama, "fragment": frag, "pasal": pasal})

    manifest = {
        "dokumen_id": dok,
        "judul": meta.get("judul", ""),
        "jenis": meta.get("jenis", ""),
        "nomor": str(meta.get("nomor", "")),
        "tahun": str(meta.get("tahun", "")),
        "sumber": meta.get("url_halaman", ""),
        "jumlah_pasal": len(segmen),
        "jumlah_chunk": len(chunks),
        "body_pasal": [lbl for lbl, _ in segmen],
        "chunks": manifest_chunks,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return {"dokumen_id": dok, "status": "prepared", "pasal": len(segmen), "chunk": len(chunks)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()

    sumber = muat_sumber()
    hanya = {x.upper() for x in args.only} if args.only else None
    WORK.mkdir(parents=True, exist_ok=True)

    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    total_chunk = 0
    hasil = []
    for dok, meta in sumber.items():
        if hanya and dok.upper() not in hanya:
            continue
        res = siapkan(dok, meta)
        state[dok] = res
        total_chunk += res.get("chunk", 0)
        hasil.append(res)
        print(f"  {dok:<16} {res.get('pasal', 0):>5} pasal -> {res.get('chunk', 0):>3} chunk ({res['status']})")

    STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nSelesai. {len(hasil)} dokumen, {total_chunk} chunk. State: {STATE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
