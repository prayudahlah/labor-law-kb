package ac.id.uns.kbr.kb;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.reasoner.OWLReasoner;

public class SwrlCalculationProvider {

    public Optional<CalculationResult> hitung(
            String topik,
            OWLNamedIndividual kasus,
            OWLOntologyManager manager,
            OWLReasoner reasoner,
            Set<String> hak) {
        return switch (topik) {
            case "PHK" -> phk(kasus, reasoner);
            case "Lembur" -> lembur(kasus, manager, reasoner);
            case "PKWT" -> pkwt(kasus, manager, reasoner);
            case "Jamsos" -> jamsos(kasus, reasoner);
            case "KIA" -> kia(kasus, manager, reasoner);
            case "Cuti" -> cuti(kasus, manager, reasoner, hak);
            default -> Optional.empty();
        };
    }

    private Optional<CalculationResult> phk(OWLNamedIndividual kasus, OWLReasoner reasoner) {
        Optional<BigDecimal> bulanUP = inferred(reasoner, kasus, "bulanUP");
        Optional<BigDecimal> bulanUPMK = inferred(reasoner, kasus, "bulanUPMK");
        Optional<BigDecimal> total = inferred(reasoner, kasus, "totalBulan");
        Optional<BigDecimal> nominal = inferred(reasoner, kasus, "nominalPesangon");
        if (bulanUP.isEmpty() || bulanUPMK.isEmpty() || total.isEmpty() || nominal.isEmpty()) {
            return Optional.empty();
        }
        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("pesangon_bulan", bulanUP.get());
        rincian.put("upmk_bulan", bulanUPMK.get());
        rincian.put("total_bulan", total.get());
        return Optional.of(new CalculationResult(rincian, nominal.get().doubleValue()));
    }

    private Optional<CalculationResult> lembur(
            OWLNamedIndividual kasus, OWLOntologyManager manager, OWLReasoner reasoner) {
        Optional<BigDecimal> upahSejam = inferred(reasoner, kasus, "upahSejam");
        Optional<BigDecimal> nominal = inferred(reasoner, kasus, "nominalLembur");
        if (upahSejam.isEmpty() || nominal.isEmpty()) {
            return Optional.empty();
        }
        OWLNamedIndividual lembur = OntologyValues.object(manager, kasus, "mengerjakanLembur");
        BigDecimal jam = OntologyValues.decimal(manager, lembur, "jamLembur");
        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("jam", jam);
        // SWRL tidak bisa membulatkan; samakan tampilan dengan fallback Java.
        rincian.put("upah_sejam", upahSejam.get().setScale(2, RoundingMode.HALF_UP));
        return Optional.of(new CalculationResult(
                rincian, nominal.get().setScale(0, RoundingMode.HALF_UP).doubleValue()));
    }

    private Optional<CalculationResult> pkwt(
            OWLNamedIndividual kasus, OWLOntologyManager manager, OWLReasoner reasoner) {
        Optional<BigDecimal> bulan = inferred(reasoner, kasus, "kompensasiBulan");
        Optional<BigDecimal> nominal = inferred(reasoner, kasus, "nominalKompensasiPKWT");
        if (bulan.isEmpty() || nominal.isEmpty()) {
            return Optional.empty();
        }
        int masaKerja = OntologyValues.integer(manager, kasus, "masaKerjaBulan");
        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("masa_kerja", masaKerja);
        rincian.put("kompensasi_bulan", bulan.get());
        return Optional.of(new CalculationResult(rincian, nominal.get().doubleValue()));
    }

    private Optional<CalculationResult> jamsos(
            OWLNamedIndividual kasus, OWLReasoner reasoner) {
        Optional<BigDecimal> persenPekerja = inferred(reasoner, kasus, "persenPekerja");
        Optional<BigDecimal> persenPengusaha = inferred(reasoner, kasus, "persenPengusaha");
        Optional<BigDecimal> iuranPekerja = inferred(reasoner, kasus, "iuranPekerja");
        Optional<BigDecimal> iuranPengusaha = inferred(reasoner, kasus, "iuranPengusaha");
        if (persenPekerja.isEmpty() || persenPengusaha.isEmpty()
                || iuranPekerja.isEmpty() || iuranPengusaha.isEmpty()) {
            return Optional.empty();
        }
        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("persen_pekerja", persenPekerja.get());
        rincian.put("persen_pengusaha", persenPengusaha.get());
        rincian.put("iuran_pekerja", iuranPekerja.get().setScale(2, RoundingMode.HALF_UP));
        rincian.put("iuran_pengusaha", iuranPengusaha.get().setScale(2, RoundingMode.HALF_UP));
        return Optional.of(new CalculationResult(rincian, iuranPekerja.get().doubleValue()));
    }

    private Optional<CalculationResult> kia(
            OWLNamedIndividual kasus, OWLOntologyManager manager, OWLReasoner reasoner) {
        Optional<BigDecimal> totalBulan = inferred(reasoner, kasus, "totalBulanUpah");
        Optional<BigDecimal> nominal = inferred(reasoner, kasus, "nominalUpahCutiMelahirkan");
        if (totalBulan.isEmpty() || nominal.isEmpty()) {
            return Optional.empty();
        }
        int cutiBulan = OntologyValues.integer(manager, kasus, "cutiMelahirkanBulan");
        Map<String, Object> rincian = new LinkedHashMap<>();
        rincian.put("cuti_bulan", cutiBulan);
        rincian.put("upah_bulan", totalBulan.get());
        return Optional.of(new CalculationResult(rincian, nominal.get().doubleValue()));
    }

    private Optional<CalculationResult> cuti(
            OWLNamedIndividual kasus,
            OWLOntologyManager manager,
            OWLReasoner reasoner,
            Set<String> hak) {
        Map<String, Object> rincian = new LinkedHashMap<>();
        inferred(reasoner, kasus, "cutiTahunanHari")
                .ifPresent(v -> rincian.put("cuti_tahunan_hari", v));

        OWLNamedIndividual peristiwa = OntologyValues.objectValues(
                        manager, kasus, "mengalamiPeristiwa")
                .findFirst()
                .orElse(null);

        String peristiwaNama = peristiwa == null
                ? null
                : peristiwa.getIRI().getFragment();

        boolean khusus = false;
        Optional<BigDecimal> khususHari = inferred(reasoner, kasus, "cutiKhususHari");
        if (khususHari.isPresent()) {
            rincian.put("hari_dibayar", khususHari.get());
            khusus = true;
        }
        if ("CutiHaid".equals(peristiwaNama)) {
            rincian.put("cuti_haid_hari", 2);
            khusus = true;
        }

        if (peristiwa != null && !khusus) {
            return Optional.empty();
        }
        if (peristiwa != null) {
            rincian.put("peristiwa", peristiwa.getIRI().getFragment());
        }
        if (rincian.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new CalculationResult(rincian, null));
    }

    private static Optional<BigDecimal> inferred(
            OWLReasoner reasoner, OWLNamedIndividual kasus, String property) {
        OWLDataProperty p = reasoner.getRootOntology().getOWLOntologyManager()
                .getOWLDataFactory()
                .getOWLDataProperty(IRI.create(OntologyValues.KTN + property));
        BigDecimal hasil = null;
        for (var literal : reasoner.getDataPropertyValues(kasus, p)) {
            BigDecimal nilai = new BigDecimal(literal.getLiteral());
            if (hasil == null) {
                hasil = nilai;
            } else if (hasil.compareTo(nilai) != 0) {
                // Duplikat individu dari peraturan berbeda bisa menghasilkan nilai
                // berbeda; jangan diam-diam ambil yang pertama.
                throw new IllegalStateException(
                        "Nilai SWRL ganda untuk " + property + ": " + hasil + " vs " + nilai);
            }
        }
        return Optional.ofNullable(hasil);
    }
}
