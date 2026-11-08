package ac.id.uns.kbr.kb;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.reasoner.OWLReasoner;

public class JavaCalculationProvider implements CalculationProvider {

    @Override
    public CalculationResult hitung(
            String topik,
            OWLNamedIndividual kasus,
            OWLOntologyManager manager,
            OWLReasoner reasoner,
            Set<String> hak) {
        return switch (topik) {
            case "PHK" -> hitungPhk(manager, kasus);
            case "Lembur" -> hitungLembur(manager, kasus);
            case "PKWT" -> hitungPkwt(manager, kasus);
            case "Jamsos" -> hitungJamsos(manager, kasus);
            case "KIA" -> hitungKia(manager, kasus);
            case "Cuti" -> hitungCuti(manager, kasus, hak);
            default -> throw new IllegalArgumentException("Topik tidak didukung: " + topik);
        };
    }

    private CalculationResult hitungPhk(OWLOntologyManager m, OWLNamedIndividual pekerja) {
        int masaKerja = OntologyValues.integer(m, pekerja, "masaKerjaBulan");
        BigDecimal upah = OntologyValues.decimal(m, pekerja, "upahBulanan");
        OWLNamedIndividual phk = OntologyValues.object(m, pekerja, "mengalami");
        OWLNamedIndividual alasan = OntologyValues.object(m, phk, "memilikiAlasanPHK");
        BigDecimal pengaliUP = OntologyValues.decimal(m, alasan, "pengaliUP");
        BigDecimal pengaliUPMK = OntologyValues.decimal(m, alasan, "pengaliUPMK");
        int upDasar = kategori(m, "KategoriUP", "upDasarBulan", masaKerja);
        int upmkDasar = kategori(m, "KategoriUPMK", "upmkDasarBulan", masaKerja);

        BigDecimal bulanUP = BigDecimal.valueOf(upDasar).multiply(pengaliUP);
        BigDecimal bulanUPMK = BigDecimal.valueOf(upmkDasar).multiply(pengaliUPMK);
        BigDecimal total = bulanUP.add(bulanUPMK);
        BigDecimal nominal = total.multiply(upah);

        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("pesangon_bulan", bulanUP);
        rincian.put("upmk_bulan", bulanUPMK);
        rincian.put("total_bulan", total);
        return new CalculationResult(rincian, nominal.doubleValue());
    }

    private CalculationResult hitungLembur(OWLOntologyManager m, OWLNamedIndividual pekerja) {
        OWLNamedIndividual lembur = OntologyValues.object(m, pekerja, "mengerjakanLembur");
        BigDecimal jam = OntologyValues.decimal(m, lembur, "jamLembur");
        boolean padaHariKerja = OntologyValues.bool(m, lembur, "padaHariKerja");
        BigDecimal upah = OntologyValues.decimal(m, pekerja, "upahBulanan");
        String jenis = padaHariKerja ? "hari_kerja" : "libur_5hari";

        BigDecimal faktor = OntologyValues.decimal(
                m, OntologyValues.individual(m, "UpahSejamLembur"), "faktorPembagiUpahSejam");
        BigDecimal upahSejam = upah.divide(faktor, 10, RoundingMode.HALF_UP);

        BigDecimal total = BigDecimal.ZERO;
        for (int h = 1; h <= jam.intValue(); h++) {
            for (OWLNamedIndividual pl : OntologyValues.individuals(m, "PengaliLembur")) {
                String jh = OntologyValues.string(m, pl, "jenisHari");
                int min = OntologyValues.integer(m, pl, "jamMin");
                int max = OntologyValues.integer(m, pl, "jamMax");
                if (jh.equals(jenis) && h >= min && h <= max) {
                    total = total.add(OntologyValues.decimal(m, pl, "pengali").multiply(upahSejam));
                    break;
                }
            }
        }

        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("jam", jam);
        rincian.put("upah_sejam", upahSejam.setScale(2, RoundingMode.HALF_UP));
        return new CalculationResult(
                rincian, total.setScale(0, RoundingMode.HALF_UP).doubleValue());
    }

    private CalculationResult hitungPkwt(OWLOntologyManager m, OWLNamedIndividual pekerja) {
        int masaKerja = OntologyValues.integer(m, pekerja, "masaKerjaBulan");
        BigDecimal upah = OntologyValues.decimal(m, pekerja, "upahBulanan");
        BigDecimal faktor = OntologyValues.decimal(
                m, OntologyValues.individual(m, "BesaranUangKompensasiPKWT"),
                "faktorPembagiKompensasi");
        BigDecimal bulan = BigDecimal.valueOf(masaKerja)
                .divide(faktor, 10, RoundingMode.HALF_UP);
        BigDecimal nominal = bulan.multiply(upah);

        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("masa_kerja", masaKerja);
        rincian.put("kompensasi_bulan", bulan);
        return new CalculationResult(rincian, nominal.doubleValue());
    }

    private CalculationResult hitungJamsos(OWLOntologyManager m, OWLNamedIndividual pekerja) {
        BigDecimal upah = OntologyValues.decimal(m, pekerja, "upahBulanan");
        OWLNamedIndividual jht = OntologyValues.individual(m, "JHT");
        OWLNamedIndividual jp = OntologyValues.individual(m, "JP");
        BigDecimal persenPekerja = OntologyValues.decimal(m, jht, "tarifPekerjaPersen")
                .add(OntologyValues.decimal(m, jp, "tarifPekerjaPersen"));
        BigDecimal persenPengusaha = OntologyValues.decimal(m, jht, "tarifPengusahaPersen")
                .add(OntologyValues.decimal(m, jp, "tarifPengusahaPersen"));
        BigDecimal iuranPekerja = persenPekerja
                .divide(BigDecimal.valueOf(100)).multiply(upah);
        BigDecimal iuranPengusaha = persenPengusaha
                .divide(BigDecimal.valueOf(100)).multiply(upah);

        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("persen_pekerja", persenPekerja);
        rincian.put("persen_pengusaha", persenPengusaha);
        rincian.put("iuran_pekerja", iuranPekerja);
        rincian.put("iuran_pengusaha", iuranPengusaha);
        return new CalculationResult(rincian, iuranPekerja.doubleValue());
    }

    private CalculationResult hitungKia(OWLOntologyManager m, OWLNamedIndividual pekerja) {
        BigDecimal upah = OntologyValues.decimal(m, pekerja, "upahBulanan");
        int bulan = OntologyValues.integer(m, pekerja, "cutiMelahirkanBulan");
        OWLNamedIndividual ket = OntologyValues.individual(m, "KetentuanUpahCutiMelahirkan");
        int bulanPenuh = OntologyValues.integer(m, ket, "bulanUpahPenuh");
        int penuh = Math.min(bulan, bulanPenuh);
        int sisa = Math.max(0, bulan - bulanPenuh);
        BigDecimal totalBulanUpah = BigDecimal.valueOf(penuh)
                .add(BigDecimal.valueOf(sisa).multiply(new BigDecimal("0.75")));
        BigDecimal nominal = totalBulanUpah.multiply(upah);

        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("cuti_bulan", bulan);
        rincian.put("upah_bulan", totalBulanUpah);
        return new CalculationResult(rincian, nominal.doubleValue());
    }

    private CalculationResult hitungCuti(
            OWLOntologyManager m, OWLNamedIndividual pekerja, Set<String> hak) {
        Map<String, Object> rincian = new LinkedHashMap<>();
        if (hak.contains("CutiTahunan") || hak.contains("MemenuhiSyaratCutiTahunan")) {
            rincian.put("cuti_tahunan_hari", 12);
        }
        try {
            OWLNamedIndividual peristiwa = OntologyValues.object(m, pekerja, "mengalamiPeristiwa");
            rincian.put("peristiwa", peristiwa.getIRI().getFragment());
            Integer hari = OntologyValues.optionalInteger(m, peristiwa, "hariDibayar");
            if (hari != null) {
                rincian.put("hari_dibayar", hari);
            }
        } catch (IllegalStateException ignored) {
            // Tidak semua kasus cuti punya peristiwa khusus.
        }
        if (hak.contains("CutiHaid") || hak.contains("MemenuhiSyaratCutiHaid")) {
            rincian.put("cuti_haid_hari", 2);
        }
        return new CalculationResult(rincian, null);
    }

    private static int kategori(
            OWLOntologyManager m, String kelas, String dasar, int masaKerja) {
        for (OWLNamedIndividual ind : OntologyValues.individuals(m, kelas)) {
            int lo = OntologyValues.integer(m, ind, "minBulan");
            Integer hi = OntologyValues.optionalInteger(m, ind, "maxBulan");
            if (masaKerja >= lo && (hi == null || masaKerja < hi)) {
                return OntologyValues.integer(m, ind, dasar);
            }
        }
        throw new IllegalStateException(
                "Kategori tidak ditemukan untuk " + kelas + " " + masaKerja);
    }
}
