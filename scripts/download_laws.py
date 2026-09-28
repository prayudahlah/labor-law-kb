#!/usr/bin/env python3
"""Unduh dokumen peraturan resmi sesuai docs/sources.yaml.

Idempotent: file yang sudah ada dilewati kecuali --force.
Untuk entri dengan url_pdf null, PDF diresolusi dari halaman resmi (peraturan.bpk.go.id).
Checksum dan ukuran dicatat di docs/downloads.lock.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "docs" / "sources.yaml"
PDF_DIR = ROOT / "docs" / "pdf"
LOCK = ROOT / "docs" / "downloads.lock.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
}

PDF_LINK_RE = re.compile(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', re.IGNORECASE)
DELAY_SECONDS = 2.0


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_pdf_url(session: requests.Session, page_url: str) -> str | None:
    resp = session.get(page_url, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    links = PDF_LINK_RE.findall(resp.text)
    if not links:
        return None
    download = [u for u in links if "/download/" in u.lower()]
    chosen = (download or links)[0]
    return urljoin(page_url, chosen)


def download(session: requests.Session, url: str, dest: Path) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    with session.get(url, headers=HEADERS, timeout=180, stream=True) as resp:
        resp.raise_for_status()
        with tmp.open("wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    head = tmp.read_bytes()[:5]
    if head != b"%PDF-":
        raise RuntimeError(f"konten bukan PDF (awal bytes: {head!r}) dari {url}")
    tmp.replace(dest)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="unduh ulang meski file ada")
    args = parser.parse_args()

    data = yaml.safe_load(SOURCES.read_text(encoding="utf-8"))
    dokumen = data["dokumen"]
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    lock: dict = {}
    if LOCK.exists():
        lock = json.loads(LOCK.read_text(encoding="utf-8"))

    session = requests.Session()
    failures = 0

    for i, doc in enumerate(dokumen):
        dest = PDF_DIR / doc["nama_file"]
        if dest.exists() and not args.force:
            print(f"[skip] {doc['id']} sudah ada ({dest.stat().st_size:,} bytes)")
        else:
            url = doc.get("url_pdf")
            try:
                if not url:
                    url = resolve_pdf_url(session, doc["url_halaman"])
                    if not url:
                        raise RuntimeError("tidak menemukan tautan PDF di halaman")
                    print(f"[resolusi] {doc['id']} -> {url}")
                print(f"[unduh] {doc['id']} ...")
                download(session, url, dest)
                print(f"        tersimpan {dest.stat().st_size:,} bytes")
            except Exception as exc:  # noqa: BLE001
                print(f"[GAGAL] {doc['id']}: {exc}", file=sys.stderr)
                failures += 1
                time.sleep(DELAY_SECONDS)
                continue

        lock[doc["id"]] = {
            "nama_file": doc["nama_file"],
            "ukuran": dest.stat().st_size,
            "sha256": sha256_of(dest),
            "sumber": doc.get("url_pdf") or doc["url_halaman"],
        }

        if i < len(dokumen) - 1 and not (dest.exists() and not args.force):
            time.sleep(DELAY_SECONDS)

    LOCK.write_text(json.dumps(lock, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nSelesai. {len(lock)} dokumen tercatat di {LOCK.relative_to(ROOT)}. Gagal: {failures}.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
