"""Perhitungan nominal (aritmetika di luar DL)."""

from __future__ import annotations

from .ontology import ktn


def nilai(individu, prop: str, default=None):
    vals = getattr(individu, prop, None)
    return vals[0] if vals else default


def ambil_kategori(kelas_kategori, masa_kerja: int):
    for k in kelas_kategori.instances():
        lo = k.minBulan[0]
        hi = k.maxBulan[0] if k.maxBulan else None
        if masa_kerja >= lo and (hi is None or masa_kerja < hi):
            return k
    return None


def hitung_pesangon(pekerja, alasan, world) -> dict:
    mk = int(nilai(pekerja, "masaKerjaBulan"))
    upah = float(nilai(pekerja, "upahBulanan"))
    p_up = float(nilai(alasan, "pengaliUP", 0))
    p_upmk = float(nilai(alasan, "pengaliUPMK", 0))
    kat_up = ambil_kategori(ktn("KategoriUP", world), mk)
    kat_upmk = ambil_kategori(ktn("KategoriUPMK", world), mk)
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


def hitung_lembur(pekerja, lembur, world) -> dict:
    upah = float(nilai(pekerja, "upahBulanan"))
    jam = float(nilai(lembur, "jamLembur"))
    pada_hari_kerja = bool(nilai(lembur, "padaHariKerja"))
    jenis = "hari_kerja" if pada_hari_kerja else "libur_5hari"
    faktor = float(nilai(ktn("UpahSejamLembur", world), "faktorPembagiUpahSejam"))
    upah_sejam = upah / faktor
    tabel = list(ktn("PengaliLembur", world).instances())
    total = 0.0
    for h in range(1, int(jam) + 1):
        for pl in tabel:
            if str(pl.jenisHari[0]) == jenis and pl.jamMin[0] <= h <= pl.jamMax[0]:
                total += float(pl.pengali[0]) * upah_sejam
                break
    return {"jam": jam, "upah_sejam": upah_sejam, "nominal": total}


def hitung_kompensasi_pkwt(pekerja, world) -> dict:
    mk = int(nilai(pekerja, "masaKerjaBulan"))
    upah = float(nilai(pekerja, "upahBulanan"))
    faktor = float(nilai(ktn("KetentuanKompensasiPKWT", world), "faktorPembagiKompensasi"))
    bulan = (mk / faktor) * 1.0
    return {"masa_kerja": mk, "bulan": bulan, "nominal": bulan * upah}


def hitung_iuran_jht_jp(pekerja, world) -> dict:
    upah = float(nilai(pekerja, "upahBulanan"))
    jht, jp = ktn("JHT", world), ktn("JP", world)
    persen_pekerja = float(jht.tarifPekerjaPersen[0]) + float(jp.tarifPekerjaPersen[0])
    persen_pengusaha = float(jht.tarifPengusahaPersen[0]) + float(jp.tarifPengusahaPersen[0])
    return {
        "persen_pekerja": persen_pekerja,
        "persen_pengusaha": persen_pengusaha,
        "iuran_pekerja": persen_pekerja / 100 * upah,
        "iuran_pengusaha": persen_pengusaha / 100 * upah,
    }


def hitung_upah_cuti_melahirkan(pekerja, world) -> dict:
    upah = float(nilai(pekerja, "upahBulanan"))
    bulan = int(nilai(pekerja, "cutiMelahirkanBulan"))
    ket = ktn("KetentuanUpahCutiMelahirkan", world)
    bulan_penuh = int(nilai(ket, "bulanUpahPenuh"))
    penuh = min(bulan, bulan_penuh)
    sisa = max(0, bulan - bulan_penuh)
    total_bulan_upah = penuh * 1.0 + sisa * 0.75
    return {"bulan": bulan, "total_bulan_upah": total_bulan_upah, "nominal": total_bulan_upah * upah}
