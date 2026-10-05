#!/usr/bin/env python3
"""Muat ontologi (Turtle -> RDF/XML cache), jalankan HermiT, verifikasi Fase 1.

Langkah:
  1. gabung semua modul .ttl (core, meta, regulasi, examples)
  2. konversi ke RDF/XML dan cache; bangun ulang hanya bila .ttl lebih baru
  3. muat ke owlready2 dan jalankan HermiT
  4. cek konsistensi, kelas unsatisfiable, klasifikasi hak, dan hitung nominal

Jalankan: .venv/bin/python scripts/check_ontology.py
"""

from __future__ import annotations

from pathlib import Path

import owlready2
import rdflib
from owlready2 import default_world

ROOT = Path(__file__).resolve().parent.parent
ONTO_DIR = ROOT / "ontology"
CACHE_KB = ONTO_DIR / ".cache" / "kb.rdfxml"
CACHE_MERGED = ONTO_DIR / ".cache" / "merged.rdfxml"
KTN = "https://example.org/kbr/ketenagakerjaan#"


def ktn(nama: str):
    """Ambil entitas pada namespace ktn: berdasarkan nama lokal."""
    ent = default_world.search_one(iri=f"{KTN}{nama}")
    if ent is None:
        raise KeyError(f"entitas tidak ditemukan: ktn:{nama}")
    return ent


def ttl_files(termasuk_contoh: bool = False) -> list[Path]:
    subs = ["core", "meta", "regulasi"]
    if termasuk_contoh:
        subs.append("examples")
    files: list[Path] = []
    for sub in subs:
        files += sorted(ONTO_DIR.glob(f"{sub}/*.ttl"))
    return files


def ensure_cache(termasuk_contoh: bool = False) -> tuple[list[Path], bool, Path]:
    cache = CACHE_MERGED if termasuk_contoh else CACHE_KB
    files = ttl_files(termasuk_contoh)
    newest = max(f.stat().st_mtime for f in files)
    if cache.exists() and cache.stat().st_mtime >= newest:
        return files, False, cache
    g = rdflib.Graph()
    for f in files:
        g.parse(f, format="turtle")
    g.remove((None, rdflib.OWL.imports, None))
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(g.serialize(format="xml").encode("utf-8"))
    return files, True, cache


def load_reasoned(termasuk_contoh: bool = False):
    """Muat KB ke owlready2 dan jalankan HermiT.

    termasuk_contoh=False -> KB murni (core, meta, regulasi), tanpa fixture examples/.
    termasuk_contoh=True  -> KB + fixture contoh (untuk skrip verifikasi).
    """
    files, dibangun, cache = ensure_cache(termasuk_contoh)
    label = "KB + contoh" if termasuk_contoh else "KB murni"
    print(
        f"[muat] {len(files)} modul Turtle ({label}), "
        f"cache {cache.name} {'dibangun ulang' if dibangun else 'dipakai'}"
    )
    owlready2.get_ontology(str(cache.resolve())).load()
    owlready2.sync_reasoner(infer_property_values=True)
    return default_world


def nilai(individu, prop: str, default=None):
    vals = getattr(individu, prop)
    return vals[0] if vals else default


def ambil_kategori(kelas_kategori, masa_kerja: int):
    for k in kelas_kategori.instances():
        lo = k.minBulan[0]
        hi = k.maxBulan[0] if k.maxBulan else None
        if masa_kerja >= lo and (hi is None or masa_kerja < hi):
            return k
    return None


def hitung(pekerja, alasan) -> dict:
    mk = int(nilai(pekerja, "masaKerjaBulan"))
    upah = float(nilai(pekerja, "upahBulanan"))
    p_up = float(nilai(alasan, "pengaliUP", 0))
    p_upmk = float(nilai(alasan, "pengaliUPMK", 0))
    kat_up = ambil_kategori(ktn("KategoriUP"), mk)
    kat_upmk = ambil_kategori(ktn("KategoriUPMK"), mk)
    bulan_up = (kat_up.upDasarBulan[0] if kat_up else 0) * p_up
    bulan_upmk = (kat_upmk.upmkDasarBulan[0] if kat_upmk else 0) * p_upmk
    total = bulan_up + bulan_upmk
    return {
        "masa_kerja": mk,
        "bulan_up": bulan_up,
        "bulan_upmk": bulan_upmk,
        "total_bulan": total,
        "nominal": total * upah,
    }


def hitung_lembur(pekerja, lembur) -> dict:
    upah = float(nilai(pekerja, "upahBulanan"))
    jam = float(nilai(lembur, "jamLembur"))
    pada_hari_kerja = bool(nilai(lembur, "padaHariKerja"))
    jenis = "hari_kerja" if pada_hari_kerja else "libur_5hari"
    upah_sejam = upah / float(nilai(ktn("UpahSejamLembur"), "faktorPembagiUpahSejam"))
    tabel = list(ktn("PengaliLembur").instances())
    total = 0.0
    for h in range(1, int(jam) + 1):
        for pl in tabel:
            if str(pl.jenisHari[0]) == jenis and pl.jamMin[0] <= h <= pl.jamMax[0]:
                total += float(pl.pengali[0]) * upah_sejam
                break
    return {"jam": jam, "upah_sejam": upah_sejam, "nominal": total}


def hitung_kompensasi_pkwt(pekerja) -> dict:
    mk = int(nilai(pekerja, "masaKerjaBulan"))
    upah = float(nilai(pekerja, "upahBulanan"))
    faktor = float(nilai(ktn("KetentuanKompensasiPKWT"), "faktorPembagiKompensasi"))
    bulan = (mk / faktor) * 1.0
    return {"masa_kerja": mk, "bulan": bulan, "nominal": bulan * upah}


def hitung_iuran_jht_jp(pekerja) -> dict:
    upah = float(nilai(pekerja, "upahBulanan"))
    jht, jp = ktn("JHT"), ktn("JP")
    persen_pekerja = float(jht.tarifPekerjaPersen[0]) + float(jp.tarifPekerjaPersen[0])
    persen_pengusaha = float(jht.tarifPengusahaPersen[0]) + float(jp.tarifPengusahaPersen[0])
    return {
        "persen_pekerja": persen_pekerja,
        "persen_pengusaha": persen_pengusaha,
        "iuran_pekerja": persen_pekerja / 100 * upah,
        "iuran_pengusaha": persen_pengusaha / 100 * upah,
    }


def hitung_upah_cuti_melahirkan(pekerja) -> dict:
    upah = float(nilai(pekerja, "upahBulanan"))
    bulan = int(nilai(pekerja, "cutiMelahirkanBulan"))
    ket = ktn("KetentuanUpahCutiMelahirkan")
    bulan_penuh = int(nilai(ket, "bulanUpahPenuh"))
    penuh = min(bulan, bulan_penuh)
    sisa = max(0, bulan - bulan_penuh)
    total_bulan_upah = penuh * 1.0 + sisa * 0.75
    return {"bulan": bulan, "total_bulan_upah": total_bulan_upah, "nominal": total_bulan_upah * upah}


def main() -> int:
    load_reasoned(termasuk_contoh=True)
    gagal = 0

    unsat = [c.name for c in default_world.classes() if owlready2.Nothing in c.ancestors()]
    print(f"[cek] kelas unsatisfiable: {unsat if unsat else 'tidak ada'}")
    if unsat:
        gagal += 1

    harapan = {
        "PekerjaBudi": {"MemenuhiSyaratPesangon", "MemenuhiSyaratUPMK", "MemenuhiSyaratUPH"},
        "PekerjaSari": {"MemenuhiSyaratUPH", "MemenuhiSyaratUangPisah"},
        "PekerjaAndi": {"MemenuhiSyaratUPMK", "MemenuhiSyaratUPH"},
        "PekerjaCukup": {"MemenuhiSyaratCutiTahunan"},
        "PekerjaWanita": {"MemenuhiSyaratCutiTahunan", "MemenuhiSyaratCutiHaid"},
        "PekerjaMenikah": {"MemenuhiSyaratCutiTahunan", "MemenuhiSyaratCutiKhusus"},
        "PekerjaLembur": {"MemenuhiSyaratUpahLembur"},
        "PekerjaKontrak": {"PekerjaPKWT", "MemenuhiSyaratKompensasiPKWT"},
        "PekerjaTetap": {"PekerjaPKWTT"},
        "PekerjaJamsos": {"MemenuhiSyaratJaminanSosial"},
        "PekerjaIbu": {"MemenuhiSyaratCutiMelahirkan"},
        "PekerjaKeguguran": {"MemenuhiSyaratCutiKeguguran"},
        "PekerjaAyah": {"MemenuhiSyaratCutiPendampinganSuami"},
    }
    tidak_harus = {
        "PekerjaSari": {"MemenuhiSyaratPesangon", "MemenuhiSyaratUPMK"},
        "PekerjaAndi": {"MemenuhiSyaratPesangon"},
        "PekerjaBaru": {"MemenuhiSyaratCutiTahunan"},
        "PekerjaMenikah": {"MemenuhiSyaratCutiHaid"},
        "PekerjaTetap": {"MemenuhiSyaratKompensasiPKWT", "PekerjaPKWT"},
    }

    print("[cek] klasifikasi hak pekerja:")
    for nama, harus in harapan.items():
        ind = ktn(nama)
        for kelas_name in sorted(harus):
            ok = ind in ktn(kelas_name).instances()
            if not ok:
                gagal += 1
            print(f"  [{'OK' if ok else 'GAGAL'}] {nama} termasuk {kelas_name}")
        for kelas_name in sorted(tidak_harus.get(nama, set())):
            if ind in ktn(kelas_name).instances():
                gagal += 1
                print(f"  [GAGAL] {nama} seharusnya TIDAK termasuk {kelas_name}")

    print("[cek] klasifikasi alasan:")
    for alasan, kelas, harus in [
        ("EfisiensiRugi", "AlasanBerpesangon", True),
        ("MengundurkanDiri", "AlasanTanpaPesangon", True),
        ("DitahanTidakMerugikan", "AlasanTanpaPesangon", True),
    ]:
        ok = (ktn(alasan) in ktn(kelas).instances()) == harus
        if not ok:
            gagal += 1
        print(f"  [{'OK' if ok else 'GAGAL'}] {alasan} termasuk {kelas}")

    print("[hitung] Kasus Budi (efisiensi rugi):")
    hasil = hitung(ktn("PekerjaBudi"), ktn("EfisiensiRugi"))
    print(
        f"  UP {hasil['bulan_up']} bulan + UPMK {hasil['bulan_upmk']} bulan "
        f"= {hasil['total_bulan']} bulan"
    )
    print(f"  nominal = Rp{hasil['nominal']:,.0f}")
    if hasil["total_bulan"] != 8.5:
        print("  [GAGAL] total bulan harus 8.5")
        gagal += 1
    if hasil["nominal"] != 42_500_000:
        print("  [GAGAL] nominal harus Rp42.500.000")
        gagal += 1

    print("[hitung] Kasus Budi lembur (4 jam hari kerja, upah Rp5.000.000):")
    hl = hitung_lembur(ktn("PekerjaLembur"), ktn("LemburBudi"))
    print(f"  upah sejam = Rp{hl['upah_sejam']:,.2f}")
    print(f"  nominal lembur = Rp{hl['nominal']:,.0f}")
    if abs(hl["nominal"] - 216_763) > 1:
        print("  [GAGAL] nominal lembur harus sekitar Rp216.763")
        gagal += 1

    print("[hitung] Kasus PekerjaKontrak (PKWT 24 bulan, upah Rp5.000.000):")
    hk = hitung_kompensasi_pkwt(ktn("PekerjaKontrak"))
    print(f"  kompensasi = {hk['bulan']} bulan = Rp{hk['nominal']:,.0f}")
    if hk["bulan"] != 2.0 or hk["nominal"] != 10_000_000:
        print("  [GAGAL] kompensasi harus 2 bulan = Rp10.000.000")
        gagal += 1

    print("[hitung] Kasus PekerjaJamsos (upah Rp5.000.000):")
    hi = hitung_iuran_jht_jp(ktn("PekerjaJamsos"))
    print(
        f"  iuran JHT+JP pekerja {hi['persen_pekerja']}% = Rp{hi['iuran_pekerja']:,.0f}; "
        f"pengusaha {hi['persen_pengusaha']}% = Rp{hi['iuran_pengusaha']:,.0f}"
    )
    if hi["persen_pekerja"] != 3.0 or hi["iuran_pekerja"] != 150_000:
        print("  [GAGAL] iuran pekerja harus 3% = Rp150.000")
        gagal += 1
    if hi["persen_pengusaha"] != 5.7 or hi["iuran_pengusaha"] != 285_000:
        print("  [GAGAL] iuran pengusaha harus 5,7% = Rp285.000")
        gagal += 1

    print("[hitung] Kasus PekerjaIbu (cuti melahirkan 6 bulan, upah Rp5.000.000):")
    hm = hitung_upah_cuti_melahirkan(ktn("PekerjaIbu"))
    print(f"  upah = {hm['total_bulan_upah']} bulan = Rp{hm['nominal']:,.0f}")
    if hm["total_bulan_upah"] != 5.5 or hm["nominal"] != 27_500_000:
        print("  [GAGAL] upah cuti melahirkan harus 5,5 bulan = Rp27.500.000")
        gagal += 1

    print()
    if gagal:
        print(f"HASIL: {gagal} pemeriksaan GAGAL")
        return 1
    print("HASIL: semua pemeriksaan LOLOS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
