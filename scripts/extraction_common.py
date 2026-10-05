#!/usr/bin/env python3
"""Utilitas bersama untuk validasi & kompilasi Extraction Record.

Hanya memakai pustaka standar + PyYAML. Dipakai oleh:
  scripts/validate_extraction.py
  scripts/compile_extraction.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MD_DIR = ROOT / "docs" / "markdown"
EXTRACT = DATA / "extraction"
VOCAB_PATH = EXTRACT / "VOCAB.yaml"
RECORDS_DIR = EXTRACT / "records"

PENJELASAN_RE = re.compile(r"^\s*PENJELASAN\s*$", re.IGNORECASE)
# Pembalut dekoratif di sekitar label pasal: '#', bold (**), backtick (`), spasi.
_PASAL_CORE = r"Pasal[\s*`_]*([0-9]+[A-Za-z]?)[\s*`_]*[.:\u2026]*[\s*`_]*$"
# Label pasal apa pun formatnya (heading, bold, backtick, polos). Dipakai cek cakupan.
PASAL_LABEL_RE = re.compile(r"^#{0,6}[\s*`_]*" + _PASAL_CORE, re.IGNORECASE)
PASAL_REF_RE = re.compile(r"^\s*Pasal\s*(\d+[A-Za-z]?)", re.IGNORECASE)


def load_vocab() -> dict:
    with VOCAB_PATH.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def angka(teks) -> str:
    """Format numerik kanonik: integer tanpa desimal, selain itu repr(float)."""
    f = float(teks)
    if f.is_integer():
        return str(int(f))
    return repr(f)


def baca_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def daftar_record(only: list[str] | None = None) -> list[Path]:
    if not RECORDS_DIR.exists():
        return []
    files = sorted(RECORDS_DIR.glob("*.json"))
    if only:
        seleksi = set(only)
        files = [f for f in files if f.stem in seleksi]
    return files


def pasal_ref(teks: str) -> str | None:
    """'Pasal 43 ayat (1)' -> 'Pasal 43'. Kembalikan None bila tak cocok."""
    m = PASAL_REF_RE.match(teks or "")
    return f"Pasal {m.group(1)}" if m else None


def _cari_markdown(dokumen_id: str) -> Path | None:
    """Cari docs/markdown/<id>.md tanpa bergantung besar-kecil huruf nama file."""
    langsung = MD_DIR / f"{dokumen_id}.md"
    if langsung.exists():
        return langsung
    target = f"{dokumen_id}.md".lower()
    for p in MD_DIR.glob("*.md"):
        if p.name.lower() == target:
            return p
    return None


def body_pasal(dokumen_id: str, loose: bool = False) -> list[str]:
    """Daftar pasal batang tubuh (sebelum PENJELASAN) dari markdown.

    Parser menangkap semua format label pasal (heading, bold, backtick, polos)
    agar cek cakupan tidak salah lapor pada markdown hasil OCR. Parameter `loose`
    dipertahankan untuk kompatibilitas dan tidak lagi mengubah perilaku.
    """
    path = _cari_markdown(dokumen_id)
    if path is None:
        return []
    pasal: list[str] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if PENJELASAN_RE.match(line):
                break
            m = PASAL_LABEL_RE.match(line.strip())
            if m:
                label = f"Pasal {m.group(1)}"
                if label not in pasal:
                    pasal.append(label)
    return pasal
