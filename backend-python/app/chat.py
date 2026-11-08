"""Router niat untuk /chat.

Upaya pertama: LLM (function calling) bila dikonfigurasi. Bila LLM tidak ada,
gagal, atau keluarannya tidak valid, jatuh ke router heuristik deterministik
(per topik).

Prinsip: LLM hanya memilih tool/mode dan mengisi field/scope; tidak menulis
query, tidak memutuskan hukum. Respons menyertakan `slot` (Level 1: transparansi).
"""

from __future__ import annotations

import logging
import re

from . import ontology, retrieval
from .config import settings
from .forms import FORM

log = logging.getLogger("kb.chat")
STATE: dict[str, dict] = {}

INFER_TOPIK = ["PHK", "Lembur", "Cuti", "PKWT", "Jamsos", "KIA"]
RETRIEVAL_ONLY = {"Upah", "WaktuKerja", "AlihDaya"}
PREFERENSI_TOPIK = ["KIA", "PKWT", "Lembur", "PHK", "Cuti", "Jamsos"]

# Field yang wajib ada untuk menjalankan analisis (di luar yang berdefault).
INFER_REQUIRED = {
    "PHK": ["masaKerjaBulan", "upahBulanan", "alasanPHK"],
    "Lembur": ["jamLembur", "upahBulanan"],
    "Cuti": ["masaKerjaBulan"],
    "PKWT": ["masaKerjaBulan", "upahBulanan"],
    "Jamsos": ["upahBulanan"],
    "KIA": ["cutiMelahirkanBulan", "upahBulanan"],
}

TOPIK_SINONIM = {
    "melahirkan": "KIA", "cuti melahirkan": "KIA", "kia": "KIA", "hamil": "KIA",
    "di-phk": "PHK", "diphk": "PHK", "di phk": "PHK", "phk": "PHK",
    "pesangon": "PHK", "pemutusan hubungan kerja": "PHK",
    "lembur": "Lembur",
    "cuti": "Cuti",
    "kontrak": "PKWT", "pkwt": "PKWT",
    "bpjs": "Jamsos", "jamsos": "Jamsos", "jaminan sosial": "Jamsos",
    "upah minimum": "Upah", "upah": "Upah", "gaji": "Upah",
    "waktu kerja": "WaktuKerja", "jam kerja": "WaktuKerja",
    "alih daya": "AlihDaya", "outsourcing": "AlihDaya",
}

INDIKATOR_RETRIEVAL = ["apa saja", "perlu apa", "apa yang perlu", "aturan", "ketentuan",
                       "syarat", "daftar", "wajib memuat", "harus ada"]
INDIKATOR_INFERENSI = ["hak saya", "hakku", "berhak", "apa yang saya dapat", "berapa",
                       "saya di-phk", "saya diphk", "saya di phk", "digaji", "gaji saya",
                       "upah saya", "lembur saya", "saya kerja", "saya bekerja", "saya kena"]

ALASAN_SINONIM = {
    "rugi": "EfisiensiRugi", "efisiensi": "EfisiensiRugi",
    "resign": "MengundurkanDiri", "mengundurkan diri": "MengundurkanDiri",
    "pensiun": "Pensiun", "meninggal": "MeninggalDunia", "pailit": "Pailit",
    "bangkrut": "Pailit", "mangkir": "Mangkir", "pelanggaran": "PelanggaranSP",
}

PERISTIWA_SINONIM = {
    "menikah": "CutiMenikah", "menikahkan": "CutiMenikahkanAnak",
    "khitan": "CutiKhitanAnak", "baptis": "CutiBaptisAnak",
    "istri melahirkan": "CutiIstriMelahirkan",
    "keluarga meninggal": "CutiKeluargaMeninggal",
    "anggota serumah meninggal": "CutiAnggotaRumahMeninggal",
}

TOOLS = [
    {"type": "function", "function": {
        "name": "isi_form",
        "description": "Isi satu field form untuk perhitungan hak (jalur inferensi).",
        "parameters": {"type": "object", "properties": {
            "field": {"type": "string", "description": "nama field, mis. masaKerjaBulan"},
            "value": {"type": "string", "description": "nilai field sebagai teks"},
        }, "required": ["field", "value"]}}},
    {"type": "function", "function": {
        "name": "cari_ketentuan",
        "description": "Cari daftar ketentuan/aturan berdasarkan topik (jalur retrieval).",
        "parameters": {"type": "object", "properties": {
            "topik": {"type": "array", "items": {"type": "string"}},
            "wajib": {"type": "boolean"},
        }, "required": ["topik"]}}},
    {"type": "function", "function": {
        "name": "klarifikasi",
        "description": "Ajukan pertanyaan klarifikasi bila maksud belum jelas.",
        "parameters": {"type": "object", "properties": {
            "pertanyaan": {"type": "string"},
        }, "required": ["pertanyaan"]}}},
]


# --- Deteksi & ekstraksi heuristik ---------------------------------------

def _deteksi_topik(pesan: str) -> list[str]:
    p = pesan.lower()
    topik = {v for k, v in TOPIK_SINONIM.items() if k in p}
    return sorted(topik)


def _ada(pesan: str, daftar: list[str]) -> bool:
    p = pesan.lower()
    return any(k in p for k in daftar)


_KATA_ANGKA = {
    "dua belas": "12", "sebelas": "11", "sepuluh": "10",
    "satu": "1", "dua": "2", "tiga": "3", "empat": "4", "lima": "5",
    "enam": "6", "tujuh": "7", "delapan": "8", "sembilan": "9",
}
_ANGKA_RE = re.compile(r"\b(" + "|".join(sorted(_KATA_ANGKA, key=len, reverse=True)) + r")\b")


def _normalisasi_angka(p: str) -> str:
    return _ANGKA_RE.sub(lambda m: _KATA_ANGKA[m.group(0)], p.lower())


def _masa_kerja(p: str) -> int | None:
    m = re.search(r"(\d+)\s*tahun", p)
    if m:
        return int(m.group(1)) * 12
    m = re.search(r"(\d+)\s*bulan", p)
    if m:
        return int(m.group(1))
    return None


def _upah(p: str) -> float | None:
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b", p)
    if m:
        return float(m.group(1).replace(",", ".")) * 1_000_000
    m = re.search(r"(\d{1,3}(?:[.,]\d{3})+|\d{4,})", p)
    if m:
        return float(re.sub(r"[.,]", "", m.group(1)))
    return None


def _ekstrak(topik: str, pesan: str) -> dict:
    p = _normalisasi_angka(pesan)
    f: dict = {}

    if topik == "PHK":
        mk, up = _masa_kerja(p), _upah(p)
        if mk is not None:
            f["masaKerjaBulan"] = mk
        if up is not None:
            f["upahBulanan"] = up
        for kata, alasan in ALASAN_SINONIM.items():
            if kata in p:
                f["alasanPHK"] = alasan
                break

    elif topik == "Lembur":
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*jam", p)
        if m:
            f["jamLembur"] = float(m.group(1).replace(",", "."))
        up = _upah(p)
        if up is not None:
            f["upahBulanan"] = up
        if "hari kerja" in p:
            f["padaHariKerja"] = True
        elif "libur" in p or "akhir pekan" in p or "weekend" in p:
            f["padaHariKerja"] = False

    elif topik == "Cuti":
        mk = _masa_kerja(p)
        if mk is not None:
            f["masaKerjaBulan"] = mk
        for kata, per in PERISTIWA_SINONIM.items():
            if kata in p:
                f["peristiwa"] = per
                break
        if any(k in p for k in ("perempuan", "ibu", "wanita")):
            f["perempuan"] = True

    elif topik == "PKWT":
        f["bentukHubunganKerja"] = "PKWT"
        mk, up = _masa_kerja(p), _upah(p)
        if mk is not None:
            f["masaKerjaBulan"] = mk
        if up is not None:
            f["upahBulanan"] = up

    elif topik == "Jamsos":
        up = _upah(p)
        if up is not None:
            f["upahBulanan"] = up

    elif topik == "KIA":
        m = re.search(r"(\d+)\s*bulan", p)
        if m:
            f["cutiMelahirkanBulan"] = int(m.group(1))
        up = _upah(p)
        if up is not None:
            f["upahBulanan"] = up
        f["sedangCutiMelahirkan"] = True

    return f


def _kurang(topik: str, fakta: dict) -> list[str]:
    return [nama for nama in INFER_REQUIRED[topik] if nama not in fakta]


def _lengkapi_default(topik: str, fakta: dict) -> dict:
    f = dict(fakta)
    if topik == "PHK":
        f.setdefault("bentukHubunganKerja", "PKWTT")
    elif topik == "Lembur":
        f.setdefault("padaHariKerja", True)
    elif topik == "PKWT":
        f.setdefault("bentukHubunganKerja", "PKWT")
    elif topik == "KIA":
        f.setdefault("sedangCutiMelahirkan", True)
    return f


def _slot(topik: str, fakta: dict, kurang: list[str]) -> dict:
    fields = [
        {"nama": s["nama"], "nilai": fakta.get(s["nama"]),
         "wajib": bool(s.get("wajib")), "terisi": s["nama"] in fakta}
        for s in FORM.get(topik, [])
    ]
    return {"topik": topik, "fields": fields, "kurang": kurang}


def _klarifikasi(pertanyaan: str, **extra) -> dict:
    return {"mode": "klarifikasi", "pertanyaan": pertanyaan,
            "catatan": "Bukan nasihat hukum.", **extra}


def _koersi(field: str, value) -> object | None:
    tipe = next((s["tipe"] for s in FORM.get("PHK", []) if s["nama"] == field), None)
    if tipe is None:
        tipe = next((s["tipe"] for t in FORM for s in FORM[t] if s["nama"] == field), None)
    try:
        if tipe == "integer":
            return int(float(value))
        if tipe == "decimal":
            return float(value)
        if tipe == "boolean":
            return str(value).lower() in ("true", "1", "ya", "yes")
        return str(value)
    except (TypeError, ValueError):
        return None


def _daftar_alasan() -> list[str]:
    from rdflib import Namespace
    from rdflib.namespace import RDF

    KTN = Namespace("https://example.org/kbr/ketenagakerjaan#")
    return sorted(str(s).rsplit("#", 1)[-1] for s in ontology.graph().subjects(RDF.type, KTN.AlasanPHK))


def _route_llm(pesan: str, state: dict) -> dict | None:
    if not (settings.llm_siap() and settings.llm_model_router):
        return None
    try:
        import json

        import httpx

        field_hint = "; ".join(f"{t}: {[s['nama'] for s in FORM[t]]}" for t in INFER_TOPIK)
        sistem = (
            "Kamu router untuk sistem hukum ketenagakerjaan Indonesia. Pilih SATU mode lewat tool.\n"
            "Aturan:\n"
            "- Jika pengguna menceritakan situasi pribadi atau menanyakan haknya "
            "-> panggil isi_form untuk SEMUA data yang disebut (termasuk upah/gaji, masa kerja, jumlah jam, dsb). "
            "JANGAN panggil cari_ketentuan.\n"
            "- Jika pengguna meminta DAFTAR aturan/ketentuan/syarat -> panggil cari_ketentuan.\n"
            "- Jika maksud tidak jelas -> panggil klarifikasi.\n"
            f"Field per topik: {field_hint}.\n"
            f"alasanPHK harus salah satu dari: {_daftar_alasan()}.\n"
            f"Topik tersedia: {retrieval.topik_tersedia()}.\n"
            "Catatan: 'cuti melahirkan'/'melahirkan' masuk topik KIA (field cutiMelahirkanBulan).\n"
            "Ubah angka dalam kata menjadi angka (mis. 'lima juta'->5000000, 'sepuluh tahun'->120 bulan).\n"
            "Contoh: 'lembur 4 jam hari kerja, gaji 5 juta' -> isi_form(jamLembur='4'), "
            "isi_form(padaHariKerja='true'), isi_form(upahBulanan='5000000').\n"
            "Contoh: 'melahirkan, cuti 6 bulan, gaji 5 juta' -> isi_form(cutiMelahirkanBulan='6'), "
            "isi_form(upahBulanan='5000000').\n"
            f"Konteks sesi: topik_infer={state.get('topik_infer')}, "
            f"fakta={state.get('fakta')}, menunggu_kelengkapan={state.get('pending')}."
        )
        r = httpx.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model_router,
                "messages": [
                    {"role": "system", "content": sistem},
                    {"role": "user", "content": pesan},
                ],
                "tools": TOOLS,
                "tool_choice": "auto",
            },
            timeout=30,
        )
        r.raise_for_status()
        calls = r.json()["choices"][0]["message"].get("tool_calls") or []
        if not calls:
            return None

        mode = None
        topik: list[str] = []
        fakta: dict = {}
        for c in calls:
            nama = c["function"]["name"]
            args = json.loads(c["function"].get("arguments") or "{}")
            if nama == "cari_ketentuan":
                mode = "retrieval"
                topik += args.get("topik", [])
            elif nama == "isi_form":
                v = _koersi(args.get("field"), args.get("value"))
                if v is not None:
                    fakta[args["field"]] = v
            elif nama == "klarifikasi":
                mode = "klarifikasi"
        if fakta:
            mode = mode or "inferensi"
        return {"mode": mode, "topik": topik, "fakta": fakta}
    except Exception as exc:  # noqa: BLE001
        log.warning("LLM router gagal, fallback heuristik: %s: %s", type(exc).__name__, exc)
        return None


def _pilih_topik_infer(detected: list[str]) -> str | None:
    kandidat = [t for t in detected if t in INFER_TOPIK]
    for pref in PREFERENSI_TOPIK:
        if pref in kandidat:
            return pref
    return None


def jawab(sesi: str, pesan: str) -> dict:
    st = STATE.setdefault(sesi, {"topik_infer": None, "topik": [], "fakta": {}, "pending": False})

    route = _route_llm(pesan, st) or {}
    detected = route.get("topik") or _deteksi_topik(pesan)
    tersedia = set(retrieval.topik_tersedia())
    detected = [t for t in detected if t in tersedia]

    infer_topik = _pilih_topik_infer(detected)
    if infer_topik is None and route.get("fakta"):
        # LLM mengisi form tapi topik tak terdeteksi: coba dari field.
        infer_topik = "PHK" if "alasanPHK" in route["fakta"] else None
    if infer_topik is None and st.get("pending") and st["topik_infer"]:
        # Lanjutan multi-turn: pakai topik yang sedang diisi.
        infer_topik = st["topik_infer"]

    heur = _ekstrak(infer_topik, pesan) if infer_topik else {}
    fakta = {**heur, **(route.get("fakta") or {})}

    if infer_topik and st["topik_infer"] != infer_topik:
        st["fakta"] = {}
        st["topik_infer"] = infer_topik
    if fakta:
        st["fakta"].update({k: v for k, v in fakta.items() if v is not None})
    if detected:
        st["topik"] = sorted(set(st["topik"]) | set(detected))

    mode = route.get("mode")
    if mode == "klarifikasi" and infer_topik:
        # Klarifikasi dari LLM diarahkan ke slot-filling bila topik sudah jelas.
        mode = "inferensi"
    if mode is None:
        if infer_topik and (_ada(pesan, INDIKATOR_INFERENSI) or st["fakta"]):
            mode = "inferensi"
        elif _ada(pesan, INDIKATOR_RETRIEVAL) or detected:
            mode = "retrieval"
        else:
            mode = "klarifikasi"

    # Guard: pertanyaan hak tidak boleh jatuh ke retrieval.
    if mode == "retrieval" and infer_topik and not _ada(pesan, INDIKATOR_RETRIEVAL) and (
        st["fakta"] or _ada(pesan, INDIKATOR_INFERENSI)
    ):
        mode = "inferensi"

    if mode == "inferensi":
        if infer_topik is None:
            return _klarifikasi("Ini soal hak pada topik apa?",
                                pilihan=INFER_TOPIK, state=st)
        kurang = _kurang(infer_topik, st["fakta"])
        if kurang:
            st["pending"] = True
            return _klarifikasi(
                "Mohon lengkapi data berikut.",
                kurang=kurang, slot=_slot(infer_topik, st["fakta"], kurang), state=st,
            )
        fakta_final = _lengkapi_default(infer_topik, st["fakta"])
        hasil = ontology.analisis(infer_topik, fakta_final)
        hasil["slot"] = _slot(infer_topik, fakta_final, [])
        st["fakta"] = {}
        st["topik_infer"] = None
        st["pending"] = False
        return hasil

    if mode == "retrieval":
        scope = st["topik"] or detected
        if not scope:
            return _klarifikasi("Dokumen/aturan tentang topik apa?",
                                pilihan=retrieval.topik_tersedia(), state=st)
        st["pending"] = False
        st["topik_infer"] = None
        return {"mode": "retrieval", "scope": {"topik": scope}, "slot": None,
                "butir": retrieval.cari(scope),
                "catatan": "Daftar ketentuan, bukan nasihat hukum."}

    return _klarifikasi("Bisa dijelaskan maksudnya? (mis. hak Anda, atau daftar ketentuan)",
                        pilihan=retrieval.topik_tersedia(), state=st)
