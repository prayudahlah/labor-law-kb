#!/usr/bin/env python3
"""Ekstrak teks PDF peraturan ke markdown terstruktur.

Untuk setiap dokumen di docs/sources.yaml:
  - membaca PDF dari docs/pdf/
  - bila ada field "halaman" (mis. "548-588"), hanya rentang itu yang diekstrak
  - menulis markdown ke docs/markdown/<id>.md

Format keluaran:
  - frontmatter YAML (metadata + status lapisan teks)
  - heading per BAB / Bagian / Paragraf / Pasal
  - tabel dipertahankan sebagai markdown
  - penanda halaman <!-- halaman N --> untuk melacak balik ke PDF

Fallback OCR: bila sebuah halaman tidak punya lapisan teks, halaman ditandai di
frontmatter (perlu_ocr: true) dan diberi peringatan. OCR tidak dijalankan karena
butuh tesseract yang tidak terpasang.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path

import numpy as np
import pymupdf
import pymupdf4llm
import yaml
from pymupdf4llm.ocr import OCRMode

_OCR_ENGINE = None


def get_ocr_engine():
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        from rapidocr_onnxruntime import RapidOCR

        _OCR_ENGINE = RapidOCR()
    return _OCR_ENGINE


def ocr_page(doc: pymupdf.Document, index: int) -> str:
    page = doc[index]
    pix = page.get_pixmap(dpi=300)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n
    )[:, :, :3]
    result = get_ocr_engine()(img)
    if not result:
        return ""
    lines, _ = result
    if not lines:
        return ""
    return "\n".join(item[1] for item in lines)

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "docs" / "sources.yaml"
PDF_DIR = ROOT / "docs" / "pdf"
MD_DIR = ROOT / "docs" / "markdown"

OCR_MIN_CHARS = 40

PAGE_NUM_RE = re.compile(r"^\s*[-\u2013]?\s*[0-9lLIO]{1,4}\s*[-\u2013]\s*$")
RUNNING_KEYWORDS = (
    "REPUBLIK",
    "REPUELIK",
    "REFTIBLIK",
    "REPTIBLIK",
    "REPUB",
    "INDONESIA",
    "IHDONESIA",
    "TNDONESIA",
    "PRESIDEN",
    "SALIN",
)
SK_RE = re.compile(r"^SK\s+No\s", re.IGNORECASE)
BARE_PASAL_RE = re.compile(r"^Pasal\s+\d+[A-Z]?$", re.IGNORECASE)


def is_running_header(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if PAGE_NUM_RE.match(stripped) or SK_RE.match(stripped):
        return True
    if len(stripped) > 45:
        return False
    upper = stripped.upper()
    if not any(k in upper for k in RUNNING_KEYWORDS):
        return False
    letters = [c for c in stripped if c.isalpha()]
    if not letters:
        return False
    uppercase_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    return uppercase_ratio > 0.7


def clean_page(md: str) -> str:
    out = []
    for line in md.splitlines():
        if is_running_header(line):
            continue
        out.append(line.rstrip())
    text = "\n".join(out)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_range(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    awal, akhir = value.split("-")
    return int(awal), int(akhir)


HEADING_RULES = [
    (re.compile(r"^#{1,6}\s*BAB\b", re.IGNORECASE), "## "),
    (re.compile(r"^#{1,6}\s*Bagian\b", re.IGNORECASE), "### "),
    (re.compile(r"^#{1,6}\s*Paragraf\b", re.IGNORECASE), "### "),
    (re.compile(r"^#{1,6}\s*Pasal\s+\d+", re.IGNORECASE), "#### "),
    (BARE_PASAL_RE, "#### "),
]


def normalize_headings(md: str) -> str:
    out = []
    for line in md.splitlines():
        replaced = False
        for pattern, prefix in HEADING_RULES:
            if pattern.match(line):
                out.append(prefix + line.lstrip("#").strip())
                replaced = True
                break
        if not replaced:
            out.append(line)
    return "\n".join(out)


def yaml_block(fields: dict) -> str:
    lines = []
    for key, value in fields.items():
        if isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        elif isinstance(value, int):
            lines.append(f"{key}: {value}")
        elif value is None:
            lines.append(f"{key}: null")
        else:
            escaped = str(value).replace('"', '\\"')
            lines.append(f'{key}: "{escaped}"')
    return "\n".join(lines)


def extract(doc_meta: dict) -> dict:
    pdf_path = PDF_DIR / doc_meta["nama_file"]
    doc = pymupdf.open(pdf_path)
    total = doc.page_count

    rng = parse_range(doc_meta.get("halaman"))
    if rng:
        pages = list(range(rng[0] - 1, rng[1]))
    else:
        pages = list(range(total))

    parts = []
    low_text_pages = []
    ocr_pages = []
    for i in pages:
        txt = doc[i].get_text().strip()
        if len(txt) < OCR_MIN_CHARS:
            low_text_pages.append(i + 1)
            page_md = clean_page(ocr_page(doc, i))
            if page_md:
                ocr_pages.append(i + 1)
        else:
            page_md = clean_page(
                pymupdf4llm.to_markdown(doc, pages=[i], use_ocr=OCRMode.NEVER)
            )
        parts.append(f"<!-- halaman {i + 1} -->\n\n{page_md}")

    body = normalize_headings("\n\n".join(parts))
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    perlu_ocr = bool(low_text_pages) and not ocr_pages
    front = {
        "judul": doc_meta["judul"],
        "jenis": doc_meta["jenis"],
        "nomor": doc_meta["nomor"],
        "tahun": doc_meta["tahun"],
        "topik": doc_meta["topik"],
        "sumber": doc_meta["url_halaman"],
        "nama_file": doc_meta["nama_file"],
        "halaman_diekstrak": doc_meta.get("halaman") or f"1-{total}",
        "jumlah_halaman_pdf": total,
        "jumlah_halaman_diekstrak": len(pages),
        "teks_layer": not low_text_pages,
        "perlu_ocr": perlu_ocr,
        "ocr_dipakai": bool(ocr_pages),
        "tanggal_ekstraksi": dt.date.today().isoformat(),
    }
    if ocr_pages:
        front["halaman_ocr"] = f"{ocr_pages[0]}-{ocr_pages[-1]}" if len(
            ocr_pages
        ) > 1 else str(ocr_pages[0])
    if low_text_pages and not ocr_pages:
        front["halaman_tanpa_teks"] = ", ".join(str(p) for p in low_text_pages[:50])

    out_path = MD_DIR / f"{doc_meta['id']}.md"
    out_path.write_text(
        "---\n" + yaml_block(front) + "\n---\n\n" + body + "\n",
        encoding="utf-8",
    )
    doc.close()
    return {
        "id": doc_meta["id"],
        "out": out_path,
        "halaman": len(pages),
        "perlu_ocr": perlu_ocr,
        "ocr_pages": ocr_pages,
        "tanpa_teks": low_text_pages if not ocr_pages else [],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="batasi ke satu atau beberapa id dokumen")
    args = parser.parse_args()

    data = yaml.safe_load(SOURCES.read_text(encoding="utf-8"))
    dokumen = data["dokumen"]
    if args.only:
        dokumen = [d for d in dokumen if d["id"] in set(args.only)]
    MD_DIR.mkdir(parents=True, exist_ok=True)
    failures = 0
    for doc_meta in dokumen:
        try:
            res = extract(doc_meta)
            flags = []
            if res["ocr_pages"]:
                flags.append(f"OCR {len(res['ocr_pages'])} halaman")
            if res["perlu_ocr"]:
                flags.append("PERLU OCR")
            flag = f" ({', '.join(flags)})" if flags else ""
            print(
                f"[ok] {res['id']}: {res['halaman']} halaman -> "
                f"{res['out'].relative_to(ROOT)}{flag}"
            )
            if res["tanpa_teks"]:
                print(
                    f"     halaman tanpa teks: "
                    f"{', '.join(map(str, res['tanpa_teks'][:20]))}"
                )
        except Exception as exc:  # noqa: BLE001
            print(f"[GAGAL] {doc_meta['id']}: {exc}", file=sys.stderr)
            failures += 1
    print(f"\nSelesai. Gagal: {failures}.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
