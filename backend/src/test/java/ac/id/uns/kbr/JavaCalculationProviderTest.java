package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLObjectProperty;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.vocab.OWL2Datatype;

import ac.id.uns.kbr.kb.CalculationResult;
import ac.id.uns.kbr.kb.JavaCalculationProvider;
import ac.id.uns.kbr.kb.OntologyLoader;
import openllet.owlapi.OpenlletReasoner;
import openllet.owlapi.OpenlletReasonerFactory;

class JavaCalculationProviderTest {

    private static final String KTN = "https://example.org/kbr/ketenagakerjaan#";

    private final JavaCalculationProvider provider = new JavaCalculationProvider();
    private OWLOntologyManager manager;
    private OWLDataFactory df;
    private OWLOntology kasus;

    @BeforeEach
    void siapkan() throws Exception {
        OWLOntology kb = OntologyLoader.load(Path.of("..", "ontology").toAbsolutePath().normalize());
        manager = kb.getOWLOntologyManager();
        df = manager.getOWLDataFactory();
        kasus = manager.createOntology(IRI.create(KTN + "KasusUji"));
        manager.applyChange(new AddImport(kasus,
                df.getOWLImportsDeclaration(kb.getOntologyID().getOntologyIRI().orElseThrow())));
    }

    @Test
    void phk() {
        OWLNamedIndividual pekerja = pekerja();
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("masaKerjaBulan"), pekerja, 120));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("upahBulanan"), pekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));

        OWLNamedIndividual phk = df.getOWLNamedIndividual(IRI.create(KTN + "KasusPHK"));
        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(
                df.getOWLClass(IRI.create(KTN + "PHK")), phk));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(op("mengalami"), pekerja, phk));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(op("memilikiAlasanPHK"), phk,
                df.getOWLNamedIndividual(IRI.create(KTN + "EfisiensiRugi"))));

        OpenlletReasoner reasoner = reasoner();
        CalculationResult hasil = provider.hitung("PHK", pekerja, manager, reasoner, hak(reasoner, pekerja));

        assertEquals(42_500_000.0, hasil.nominal(), 0.001);
        assertEquals(0, new BigDecimal("8.5")
                .compareTo((BigDecimal) hasil.rincian().get("total_bulan")));
    }

    @Test
    void lembur() {
        OWLNamedIndividual pekerja = pekerja();
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("upahBulanan"), pekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));

        OWLNamedIndividual lembur = df.getOWLNamedIndividual(IRI.create(KTN + "KasusLembur"));
        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(
                df.getOWLClass(IRI.create(KTN + "Lembur")), lembur));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(
                op("mengerjakanLembur"), pekerja, lembur));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("jamLembur"), lembur,
                df.getOWLLiteral("4", OWL2Datatype.XSD_DECIMAL)));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("padaHariKerja"), lembur,
                df.getOWLLiteral(true)));

        OpenlletReasoner reasoner = reasoner();
        CalculationResult hasil = provider.hitung("Lembur", pekerja, manager, reasoner, hak(reasoner, pekerja));

        assertEquals(216_763.0, hasil.nominal(), 0.001);
        assertEquals(0, new BigDecimal("28901.73")
                .compareTo((BigDecimal) hasil.rincian().get("upah_sejam")));
    }

    @Test
    void pkwt() {
        OWLNamedIndividual pekerja = pekerja();
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("masaKerjaBulan"), pekerja, 24));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("upahBulanan"), pekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));

        OpenlletReasoner reasoner = reasoner();
        CalculationResult hasil = provider.hitung("PKWT", pekerja, manager, reasoner, hak(reasoner, pekerja));

        assertEquals(10_000_000.0, hasil.nominal(), 0.001);
    }

    @Test
    void jamsos() {
        OWLNamedIndividual pekerja = pekerja();
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("upahBulanan"), pekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));

        OpenlletReasoner reasoner = reasoner();
        CalculationResult hasil = provider.hitung("Jamsos", pekerja, manager, reasoner, hak(reasoner, pekerja));

        assertEquals(150_000.0, hasil.nominal(), 0.001);
        assertEquals(0, new BigDecimal("285000")
                .compareTo((BigDecimal) hasil.rincian().get("iuran_pengusaha")));
    }

    @Test
    void kia() {
        OWLNamedIndividual pekerja = pekerja();
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("cutiMelahirkanBulan"), pekerja, 6));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("upahBulanan"), pekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));

        OpenlletReasoner reasoner = reasoner();
        CalculationResult hasil = provider.hitung("KIA", pekerja, manager, reasoner, hak(reasoner, pekerja));

        assertEquals(27_500_000.0, hasil.nominal(), 0.001);
        assertEquals(0, new BigDecimal("5.5")
                .compareTo((BigDecimal) hasil.rincian().get("upah_bulan")));
    }

    @Test
    void cuti() {
        OWLNamedIndividual pekerja = pekerja();
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(dp("masaKerjaBulan"), pekerja, 12));

        OpenlletReasoner reasoner = reasoner();
        CalculationResult hasil = provider.hitung("Cuti", pekerja, manager, reasoner, hak(reasoner, pekerja));

        assertEquals(12, ((Number) hasil.rincian().get("cuti_tahunan_hari")).intValue());
        assertNull(hasil.nominal());
    }

    private OWLNamedIndividual pekerja() {
        OWLNamedIndividual pekerja = df.getOWLNamedIndividual(IRI.create(KTN + "KasusPekerja"));
        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(
                df.getOWLClass(IRI.create(KTN + "Pekerja")), pekerja));
        return pekerja;
    }

    private OpenlletReasoner reasoner() {
        return OpenlletReasonerFactory.getInstance().createReasoner(kasus);
    }

    private Set<String> hak(OpenlletReasoner reasoner, OWLNamedIndividual individu) {
        return reasoner.getTypes(individu, false).getFlattened().stream()
                .map(c -> c.getIRI().getFragment())
                .collect(Collectors.toSet());
    }

    private OWLDataProperty dp(String nama) {
        return df.getOWLDataProperty(IRI.create(KTN + nama));
    }

    private OWLObjectProperty op(String nama) {
        return df.getOWLObjectProperty(IRI.create(KTN + nama));
    }
}
