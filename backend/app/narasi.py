"""Narasi jawaban: merapikan hasil deterministik menjadi kalimat.

LLM hanya boleh merapikan teks dari data yang diberikan, TIDAK menambah fakta.
Bila LLM tidak dikonfigurasi atau gagal, dipakai template deterministik.
"""

from __future__ import annotations

from .config import settings


def narasi(hasil: dict) -> str:
    teks = _narasi_llm(hasil)
    if teks:
        return teks
    return _narasi_template(hasil)


def _format_rupiah(nilai: float | None) -> str:
    if nilai is None:
        return "-"
    return "Rp" + f"{nilai:,.0f}".replace(",", ".")


def _narasi_template(hasil: dict) -> str:
    mode = hasil.get("mode")

    if mode == "inferensi":
        hak = ", ".join(hasil.get("hak", [])) or "tidak ada"
        pasal = "; ".join(hasil.get("pasal", [])) or "-"
        nominal = hasil.get("nominal")
        rincian = hasil.get("rincian") or {}
        if nominal is not None:
            angka = f"Perkiraan nominal {_format_rupiah(nominal)}"
        elif rincian:
            angka = "Rincian: " + ", ".join(f"{k}={v}" for k, v in rincian.items())
        else:
            angka = ""
        inti = f"Berdasarkan data Anda, hak yang terpenuhi: {hak}."
        if angka:
            inti += f" {angka}."
        return f"{inti} Dasar: {pasal}. {hasil.get('catatan', '')}".strip()

    if mode == "retrieval":
        butir = hasil.get("butir", [])
        scope = hasil.get("scope", {})
        topik = ", ".join(scope.get("topik", [])) or "-"
        if not butir:
            return f"Tidak ada ketentuan ditemukan untuk topik {topik}."
        contoh = "; ".join(f"{b['pasal']}" for b in butir[:4])
        return (
            f"Terdapat {len(butir)} ketentuan untuk topik {topik}. "
            f"Contoh dasar: {contoh}. {hasil.get('catatan', '')}"
        ).strip()

    return hasil.get("pertanyaan", "") or hasil.get("catatan", "")


def _narasi_llm(hasil: dict) -> str | None:
    if not (settings.llm_siap() and settings.llm_model_narasi):
        return None
    try:
        import json

        import httpx

        sistem = (
            "Kamu merapikan jawaban hukum ketenagakerjaan dalam Bahasa Indonesia. "
            "Gunakan HANYA fakta pada JSON yang diberikan. Dilarang menambah fakta, "
            "pasal, atau angka baru. Sertakan sitasi pasal bila ada. Maksimal 4 kalimat."
        )
        r = httpx.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model_narasi,
                "messages": [
                    {"role": "system", "content": sistem},
                    {"role": "user", "content": json.dumps(hasil, ensure_ascii=False)},
                ],
            },
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None
