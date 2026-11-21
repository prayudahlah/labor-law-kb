package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;

import ac.id.uns.kbr.kb.CalculationResult;
import ac.id.uns.kbr.kb.CaseSession;
import ac.id.uns.kbr.kb.Forms;
import ac.id.uns.kbr.kb.JavaCalculationProvider;
import ac.id.uns.kbr.kb.OntologyLoader;
import ac.id.uns.kbr.kb.OntologyValues;
import ac.id.uns.kbr.kb.SwrlCalculationProvider;

/**
 * Uji end-to-end modul SWRL: ABox ditulis lewat {@link Forms}, dijalankan
 * dengan Openllet, lalu dibaca {@link SwrlCalculationProvider} seperti di
 * produksi. Angka harapan sama dengan backend/golden-cases.json.
 */
class SwrlKalkulasiTest {

    private static final String KTN = OntologyValues.KTN;

    private static OWLOntology kb;
    private static OWLOntologyManager manager;

    @BeforeAll
    static void muatKb() throws Exception {
        kb = OntologyLoader.load(Path.of("..", "ontology").toAbsolutePath().normalize());
        manager = kb.getOWLOntologyManager();
    }

    private static CaseSession bukaSesi(String topik, Map<String, Object> fakta) throws Exception {
        OWLDataFactory df = manager.getOWLDataFactory();
        OWLOntology kasus = manager.createOntology(
                IRI.create(KTN + "KasusUji" + UUID.randomUUID()));
        manager.applyChange(new AddImport(kasus,
                df.getOWLImportsDeclaration(kb.getOntologyID().getOntologyIRI().orElseThrow())));
        CaseSession sesi = new CaseSession(manager, df, kasus);
        new Forms().isi(sesi, topik, fakta);
        return sesi;
    }

    private static CalculationResult hitungSwrl(String topik, Map<String, Object> fakta)
            throws Exception {
        try (CaseSession sesi = bukaSesi(topik, fakta)) {
            OWLNamedIndividual kasus = OntologyValues.individual(manager, "KasusPekerja");
            return new SwrlCalculationProvider()
                    .hitung(topik, kasus, manager, sesi.reasoner(), Set.of())
                    .orElseThrow(() -> new AssertionError(
                            "SWRL tidak menghasilkan output untuk topik " + topik));
        }
    }

    private static Optional<CalculationResult> hitungSwrlOpsional(
            String topik, Map<String, Object> fakta) throws Exception {
        try (CaseSession sesi = bukaSesi(topik, fakta)) {
            OWLNamedIndividual kasus = OntologyValues.individual(manager, "KasusPekerja");
            return new SwrlCalculationProvider()
                    .hitung(topik, kasus, manager, sesi.reasoner(), Set.of());
        }
    }

    private static void sama(String harapan, Object nilai) {
        assertEquals(0, new BigDecimal(harapan).compareTo(new BigDecimal(nilai.toString())),
                "harapan " + harapan + " tetapi " + nilai);
    }

    private static void samaToleransi(double harapan, Object nilai, double toleransi) {
        double aktual = new BigDecimal(nilai.toString()).doubleValue();
        assertEquals(harapan, aktual, toleransi,
                "harapan " + harapan + " tetapi " + aktual);
    }

    @Test
    void phkEfisiensiRugiSamaDenganGoldenCase() throws Exception {
        CalculationResult hasil = hitungSwrl("PHK", Map.of(
                "masaKerjaBulan", 120,
                "upahBulanan", 5_000_000,
                "bentukHubunganKerja", "PKWTT",
                "alasanPHK", "EfisiensiRugi"));

        sama("4.5", hasil.rincian().get("pesangon_bulan"));
        sama("4.0", hasil.rincian().get("upmk_bulan"));
        sama("8.5", hasil.rincian().get("total_bulan"));
        sama("42500000", hasil.nominal());
    }

    @Test
    void phkMasaKerjaKurang36UPMKNol() throws Exception {
        CalculationResult hasil = hitungSwrl("PHK", Map.of(
                "masaKerjaBulan", 6,
                "upahBulanan", 12_000_000,
                "bentukHubunganKerja", "PKWTT",
                "alasanPHK", "EfisiensiRugi"));

        sama("0.5", hasil.rincian().get("pesangon_bulan"));
        sama("0", hasil.rincian().get("upmk_bulan"));
        sama("0.5", hasil.rincian().get("total_bulan"));
        sama("6000000", hasil.nominal());
    }

    @Test
    void phkBracketTerbukaMemakaiMarkerClass() throws Exception {
        CalculationResult hasil = hitungSwrl("PHK", Map.of(
                "masaKerjaBulan", 200,
                "upahBulanan", 5_000_000,
                "bentukHubunganKerja", "PKWTT",
                "alasanPHK", "EfisiensiRugi"));

        sama("4.5", hasil.rincian().get("pesangon_bulan"));
        sama("6.0", hasil.rincian().get("upmk_bulan"));
        sama("10.5", hasil.rincian().get("total_bulan"));
        sama("52500000", hasil.nominal());
    }

    @Test
    void pkwtKompensasiSamaDenganGoldenCase() throws Exception {
        CalculationResult hasil = hitungSwrl("PKWT", Map.of(
                "bentukHubunganKerja", "PKWT",
                "masaKerjaBulan", 24,
                "upahBulanan", 5_000_000));

        sama("2.0", hasil.rincian().get("kompensasi_bulan"));
        sama("10000000", hasil.nominal());
    }

    @Test
    void jamsosJhtJpSamaDenganGoldenCase() throws Exception {
        CalculationResult hasil = hitungSwrl("Jamsos", Map.of("upahBulanan", 5_000_000));

        sama("3.0", hasil.rincian().get("persen_pekerja"));
        sama("5.7", hasil.rincian().get("persen_pengusaha"));
        sama("150000", hasil.rincian().get("iuran_pekerja"));
        sama("285000", hasil.rincian().get("iuran_pengusaha"));
        sama("150000", hasil.nominal());
    }

    @Test
    void kiaUpahCutiMelahirkanSamaDenganGoldenCase() throws Exception {
        CalculationResult hasil = hitungSwrl("KIA", Map.of(
                "sedangCutiMelahirkan", true,
                "cutiMelahirkanBulan", 6,
                "upahBulanan", 5_000_000));

        sama("6", hasil.rincian().get("cuti_bulan"));
        sama("5.5", hasil.rincian().get("upah_bulan"));
        sama("27500000", hasil.nominal());
    }

    @Test
    void lemburEmpatJamHariKerjaSamaDenganGoldenCase() throws Exception {
        CalculationResult hasil = hitungSwrl("Lembur", Map.of(
                "jamLembur", 4,
                "padaHariKerja", true,
                "upahBulanan", 5_000_000));

        sama("4.0", hasil.rincian().get("jam"));
        sama("28901.73", hasil.rincian().get("upah_sejam"));
        sama("216763", hasil.nominal());
    }

    @Test
    void lemburLiburEnamHariMemakaiJenisHari() throws Exception {
        CalculationResult hasil = hitungSwrl("Lembur", Map.of(
                "jamLembur", 8,
                "jenisHari", "libur_6hari",
                "upahBulanan", 5_000_000));

        sama("491329", hasil.nominal());
    }

    @Test
    void lemburLiburTerpendekMemakaiJenisHari() throws Exception {
        CalculationResult hasil = hitungSwrl("Lembur", Map.of(
                "jamLembur", 6,
                "jenisHari", "libur_terpendek",
                "upahBulanan", 5_000_000));

        sama("375723", hasil.nominal());
    }

    @Test
    void lemburLiburEnamHariSebelasJam() throws Exception {
        CalculationResult hasil = hitungSwrl("Lembur", Map.of(
                "jamLembur", 11,
                "jenisHari", "libur_6hari",
                "upahBulanan", 5_000_000));

        sama("838150", hasil.nominal());
    }

    @Test
    void lemburLiburEnamHariDuaBelasJamKosong() throws Exception {
        Optional<CalculationResult> hasil = hitungSwrlOpsional("Lembur", Map.of(
                "jamLembur", 12,
                "jenisHari", "libur_6hari",
                "upahBulanan", 5_000_000));

        assertTrue(hasil.isEmpty());
    }

    @Test
    void lemburLiburTerpendekSembilanJam() throws Exception {
        CalculationResult hasil = hitungSwrl("Lembur", Map.of(
                "jamLembur", 9,
                "jenisHari", "libur_terpendek",
                "upahBulanan", 5_000_000));

        sama("722543", hasil.nominal());
    }

    @Test
    void lemburLiburTerpendekSepuluhJamKosong() throws Exception {
        Optional<CalculationResult> hasil = hitungSwrlOpsional("Lembur", Map.of(
                "jamLembur", 10,
                "jenisHari", "libur_terpendek",
                "upahBulanan", 5_000_000));

        assertTrue(hasil.isEmpty());
    }

    @Test
    void lemburPecahanMengembalikanKosong() throws Exception {
        Optional<CalculationResult> hasil = hitungSwrlOpsional("Lembur", Map.of(
                "jamLembur", 3.5,
                "padaHariKerja", true,
                "upahBulanan", 5_000_000));

        assertTrue(hasil.isEmpty());
    }

    @Test
    void lemburHariKerjaLimaMengembalikanKosong() throws Exception {
        Optional<CalculationResult> hasil = hitungSwrlOpsional("Lembur", Map.of(
                "jamLembur", 5,
                "padaHariKerja", true,
                "upahBulanan", 5_000_000));

        assertTrue(hasil.isEmpty());
    }

    @Test
    void cutiTahunanMengambilNilaiDariKb() throws Exception {
        CalculationResult hasil = hitungSwrl("Cuti", Map.of("masaKerjaBulan", 12));

        sama("12", hasil.rincian().get("cuti_tahunan_hari"));
    }

    @Test
    void cutiKhususTanpaRuleMengembalikanKosong() throws Exception {
        Optional<CalculationResult> hasil = hitungSwrlOpsional("Cuti", Map.of(
                "masaKerjaBulan", 12,
                "peristiwa", "UpahCutiMenikah"));

        assertTrue(hasil.isEmpty());
    }

    @Test
    void cutiHaidMengembalikanDuaHari() throws Exception {
        CalculationResult hasil = hitungSwrl("Cuti", Map.of(
                "masaKerjaBulan", 12,
                "peristiwa", "CutiHaid"));

        sama("2", hasil.rincian().get("cuti_haid_hari"));
    }

    @Test
    void cutiKeguguranMengembalikanKosong() throws Exception {
        Optional<CalculationResult> hasil = hitungSwrlOpsional("Cuti", Map.of(
                "masaKerjaBulan", 12,
                "perempuan", true,
                "peristiwa", "CutiKeguguran"));

        assertTrue(hasil.isEmpty());
    }

    @Test
    void pkwtMasaKerjaBukanKelipatanDuaBelasTetapDesimal() throws Exception {
        CalculationResult hasil = hitungSwrl("PKWT", Map.of(
                "bentukHubunganKerja", "PKWT",
                "masaKerjaBulan", 25,
                "upahBulanan", 5_000_000));

        samaToleransi(25.0 / 12.0, hasil.rincian().get("kompensasi_bulan"), 1e-6);
        samaToleransi(25.0 / 12.0 * 5_000_000, hasil.nominal(), 0.01);
    }

    @Test
    void kiaKurangDariBulanPenuhDibayarPenuh() throws Exception {
        CalculationResult hasil = hitungSwrl("KIA", Map.of(
                "sedangCutiMelahirkan", true,
                "cutiMelahirkanBulan", 3,
                "upahBulanan", 5_000_000));

        sama("3", hasil.rincian().get("upah_bulan"));
        sama("15000000", hasil.nominal());
    }

    @Test
    void kiaTepatBulanPenuhTidakKenaPotongan() throws Exception {
        CalculationResult hasil = hitungSwrl("KIA", Map.of(
                "sedangCutiMelahirkan", true,
                "cutiMelahirkanBulan", 4,
                "upahBulanan", 5_000_000));

        sama("4", hasil.rincian().get("upah_bulan"));
        sama("20000000", hasil.nominal());
    }

    @Test
    void phkBerbagaiBracketMasaKerja() throws Exception {
        record Kasus(int bulan, String up, String upmk, String total, String nominal) {
        }
        Kasus[] kasus = {
                new Kasus(36, "2.0", "2.0", "4.0", "20000000"),
                new Kasus(48, "2.5", "2.0", "4.5", "22500000"),
                new Kasus(72, "3.5", "3.0", "6.5", "32500000"),
                new Kasus(96, "4.5", "3.0", "7.5", "37500000"),
                new Kasus(300, "4.5", "10.0", "14.5", "72500000"),
        };

        for (Kasus k : kasus) {
            CalculationResult hasil = hitungSwrl("PHK", Map.of(
                    "masaKerjaBulan", k.bulan(),
                    "upahBulanan", 5_000_000,
                    "bentukHubunganKerja", "PKWTT",
                    "alasanPHK", "EfisiensiRugi"));
            String pesan = "masa kerja " + k.bulan() + " bulan";
            sama(k.up(), hasil.rincian().get("pesangon_bulan"));
            sama(k.upmk(), hasil.rincian().get("upmk_bulan"));
            sama(k.total(), hasil.rincian().get("total_bulan"));
            sama(k.nominal(), hasil.nominal());
            assertTrue(hasil.nominal() > 0, pesan);
        }
    }

    @Test
    void phkAlasanTanpaPesangonMenghasilkanNol() throws Exception {
        CalculationResult hasil = hitungSwrl("PHK", Map.of(
                "masaKerjaBulan", 120,
                "upahBulanan", 5_000_000,
                "bentukHubunganKerja", "PKWTT",
                "alasanPHK", "MengundurkanDiri"));

        sama("0", hasil.rincian().get("pesangon_bulan"));
        sama("0", hasil.rincian().get("upmk_bulan"));
        sama("0", hasil.rincian().get("total_bulan"));
        sama("0", hasil.nominal());
    }

    @Test
    void lemburHariLiburMemakaiTabelAkumulatif() throws Exception {
        record Kasus(int jam, String nominal) {
        }
        Kasus[] kasus = {
                new Kasus(8, "462428"),
                new Kasus(9, "549133"),
                new Kasus(12, "895954"),
        };

        for (Kasus k : kasus) {
            CalculationResult hasil = hitungSwrl("Lembur", Map.of(
                    "jamLembur", k.jam(),
                    "padaHariKerja", false,
                    "upahBulanan", 5_000_000));
            sama(k.nominal(), hasil.nominal());
        }
    }

    @Test
    void hasilSwrlSamaDenganPerhitunganJava() throws Exception {
        Map<String, Object> fakta = Map.of(
                "masaKerjaBulan", 120,
                "upahBulanan", 5_000_000,
                "bentukHubunganKerja", "PKWTT",
                "alasanPHK", "EfisiensiRugi");

        try (CaseSession sesi = bukaSesi("PHK", fakta)) {
            OWLNamedIndividual kasus = OntologyValues.individual(manager, "KasusPekerja");
            var reasoner = sesi.reasoner();
            CalculationResult swrl = new SwrlCalculationProvider()
                    .hitung("PHK", kasus, manager, reasoner, Set.of())
                    .orElseThrow();
            CalculationResult java = new JavaCalculationProvider()
                    .hitung("PHK", kasus, manager, reasoner, Set.of());

            assertEquals(0, new BigDecimal(swrl.nominal().toString())
                    .compareTo(new BigDecimal(java.nominal().toString())));
            assertTrue(swrl.rincian().keySet().containsAll(java.rincian().keySet()));
        }
    }
}
