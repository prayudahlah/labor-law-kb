package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.reasoner.InferenceType;
import org.semanticweb.owlapi.search.EntitySearcher;
import org.semanticweb.owlapi.vocab.OWL2Datatype;

import ac.id.uns.kbr.kb.OntologyLoader;
import openllet.owlapi.OpenlletReasoner;
import openllet.owlapi.OpenlletReasonerFactory;

class PhkGoldenCaseTest {

    private static final String KTN = "https://example.org/kbr/ketenagakerjaan#";

    @Test
    void phkEfisiensiRugiMenghasilkan42_5Juta() throws Exception {
        Path ontologyDir = Path.of("..", "ontology").toAbsolutePath().normalize();
        OWLOntology kb = OntologyLoader.load(ontologyDir);
        OWLOntologyManager manager = kb.getOWLOntologyManager();
        OWLDataFactory df = manager.getOWLDataFactory();

        OWLOntology kasus = manager.createOntology(IRI.create(KTN + "KasusSpike"));
        manager.applyChange(new AddImport(kasus,
                df.getOWLImportsDeclaration(kb.getOntologyID().getOntologyIRI().orElseThrow())));

        OWLNamedIndividual pekerja = df.getOWLNamedIndividual(IRI.create(KTN + "KasusPekerja"));
        OWLNamedIndividual phk = df.getOWLNamedIndividual(IRI.create(KTN + "KasusPHK"));
        OWLNamedIndividual alasan = df.getOWLNamedIndividual(IRI.create(KTN + "EfisiensiRugi"));

        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(
                df.getOWLClass(IRI.create(KTN + "Pekerja")), pekerja));
        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(
                df.getOWLClass(IRI.create(KTN + "PHK")), phk));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(
                df.getOWLObjectProperty(IRI.create(KTN + "mengalami")), pekerja, phk));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(
                df.getOWLObjectProperty(IRI.create(KTN + "memilikiAlasanPHK")), phk, alasan));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(
                df.getOWLDataProperty(IRI.create(KTN + "masaKerjaBulan")), pekerja, 120));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(
                df.getOWLDataProperty(IRI.create(KTN + "upahBulanan")), pekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(
                df.getOWLDataProperty(IRI.create(KTN + "bentukHubunganKerja")), pekerja,
                df.getOWLLiteral("PKWTT")));

        OpenlletReasoner reasoner = OpenlletReasonerFactory.getInstance().createReasoner(kasus);
        reasoner.precomputeInferences(InferenceType.CLASS_ASSERTIONS);

        Set<String> tipe = reasoner.getTypes(pekerja, false).getFlattened().stream()
                .map(c -> c.getIRI().getFragment())
                .collect(Collectors.toSet());

        assertTrue(tipe.contains("MemenuhiSyaratPesangon"), "tipe: " + tipe);
        assertTrue(tipe.contains("MemenuhiSyaratUPMK"), "tipe: " + tipe);
        assertTrue(tipe.contains("MemenuhiSyaratUPH"), "tipe: " + tipe);

        BigDecimal pengaliUP = decimal(manager, alasan, "pengaliUP");
        BigDecimal pengaliUPMK = decimal(manager, alasan, "pengaliUPMK");
        int upDasar = kategori(manager, "KategoriUP", "upDasarBulan", 120);
        int upmkDasar = kategori(manager, "KategoriUPMK", "upmkDasarBulan", 120);

        BigDecimal bulanUP = BigDecimal.valueOf(upDasar).multiply(pengaliUP);
        BigDecimal bulanUPMK = BigDecimal.valueOf(upmkDasar).multiply(pengaliUPMK);
        BigDecimal total = bulanUP.add(bulanUPMK);
        BigDecimal nominal = total.multiply(BigDecimal.valueOf(5_000_000));

        assertEquals(0, new BigDecimal("4.5").compareTo(bulanUP));
        assertEquals(0, new BigDecimal("4.0").compareTo(bulanUPMK));
        assertEquals(0, new BigDecimal("8.5").compareTo(total));
        assertEquals(0, new BigDecimal("42500000").compareTo(nominal));
    }

    private static BigDecimal decimal(OWLOntologyManager manager, OWLNamedIndividual ind, String prop) {
        OWLDataProperty p = manager.getOWLDataFactory()
                .getOWLDataProperty(IRI.create(KTN + prop));
        return dataValues(manager, ind, p)
                .findFirst()
                .map(lit -> new BigDecimal(lit.getLiteral()))
                .orElseThrow(() -> new IllegalStateException("Nilai " + prop + " tidak ditemukan"));
    }

    private static int kategori(OWLOntologyManager manager, String kelas, String dasar, int masaKerja) {
        OWLDataFactory df = manager.getOWLDataFactory();
        OWLClass k = df.getOWLClass(IRI.create(KTN + kelas));
        OWLDataProperty min = df.getOWLDataProperty(IRI.create(KTN + "minBulan"));
        OWLDataProperty max = df.getOWLDataProperty(IRI.create(KTN + "maxBulan"));
        OWLDataProperty dasarProp = df.getOWLDataProperty(IRI.create(KTN + dasar));

        List<OWLNamedIndividual> individu = individuals(manager, k).toList();

        for (OWLNamedIndividual ind : individu) {
            int lo = intValue(manager, ind, min);
            Integer hi = optionalInt(manager, ind, max);
            if (masaKerja >= lo && (hi == null || masaKerja < hi)) {
                return intValue(manager, ind, dasarProp);
            }
        }
        throw new IllegalStateException("Kategori tidak ditemukan untuk " + kelas + " " + masaKerja);
    }

    private static Stream<OWLLiteral> dataValues(
            OWLOntologyManager manager, OWLNamedIndividual ind, OWLDataProperty p) {
        return manager.getOntologies().stream()
                .flatMap(o -> EntitySearcher.getDataPropertyValues(ind, p, o));
    }

    private static Stream<OWLNamedIndividual> individuals(OWLOntologyManager manager, OWLClass k) {
        return manager.getOntologies().stream()
                .flatMap(o -> EntitySearcher.getIndividuals(k, o))
                .filter(OWLNamedIndividual.class::isInstance)
                .map(OWLNamedIndividual.class::cast)
                .distinct();
    }

    private static int intValue(OWLOntologyManager manager, OWLNamedIndividual ind, OWLDataProperty p) {
        return dataValues(manager, ind, p)
                .findFirst()
                .map(lit -> Integer.parseInt(lit.getLiteral()))
                .orElseThrow();
    }

    private static Integer optionalInt(OWLOntologyManager manager, OWLNamedIndividual ind, OWLDataProperty p) {
        return dataValues(manager, ind, p)
                .findFirst()
                .map(lit -> Integer.parseInt(lit.getLiteral()))
                .orElse(null);
    }
}
