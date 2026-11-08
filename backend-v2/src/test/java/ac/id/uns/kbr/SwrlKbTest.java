package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLObjectProperty;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.model.SWRLAtom;
import org.semanticweb.owlapi.model.SWRLDArgument;
import org.semanticweb.owlapi.model.SWRLVariable;
import org.semanticweb.owlapi.reasoner.InferenceType;
import org.semanticweb.owlapi.vocab.OWL2Datatype;

import ac.id.uns.kbr.kb.OntologyLoader;
import openllet.owlapi.OpenlletReasoner;
import openllet.owlapi.OpenlletReasonerFactory;

class SwrlKbTest {

    private static final String KTN = "https://example.org/kbr/ketenagakerjaan#";
    private static final String SWRLB = "http://www.w3.org/2003/11/swrlb#";

    @Test
    void swrlbMultiplyMemakaiPropertiKb() throws Exception {
        Path ontologyDir = Path.of("..", "ontology").toAbsolutePath().normalize();
        OWLOntology kb = OntologyLoader.load(ontologyDir);
        OWLOntologyManager manager = kb.getOWLOntologyManager();
        OWLDataFactory df = manager.getOWLDataFactory();

        OWLOntology kasus = manager.createOntology(IRI.create(KTN + "KasusSwrl"));
        manager.applyChange(new AddImport(kasus,
                df.getOWLImportsDeclaration(kb.getOntologyID().getOntologyIRI().orElseThrow())));

        OWLClass pekerja = df.getOWLClass(IRI.create(KTN + "Pekerja"));
        OWLClass phkClass = df.getOWLClass(IRI.create(KTN + "PHK"));
        OWLObjectProperty mengalami = df.getOWLObjectProperty(IRI.create(KTN + "mengalami"));
        OWLObjectProperty alasanProp = df.getOWLObjectProperty(IRI.create(KTN + "memilikiAlasanPHK"));
        OWLDataProperty upah = df.getOWLDataProperty(IRI.create(KTN + "upahBulanan"));
        OWLDataProperty pengali = df.getOWLDataProperty(IRI.create(KTN + "pengaliUP"));
        OWLDataProperty nominal = df.getOWLDataProperty(IRI.create(KTN + "nominalPesangon"));

        manager.addAxiom(kasus, df.getOWLDeclarationAxiom(nominal));

        OWLNamedIndividual kasusPekerja = df.getOWLNamedIndividual(IRI.create(KTN + "KasusPekerja"));
        OWLNamedIndividual kasusPhk = df.getOWLNamedIndividual(IRI.create(KTN + "KasusPHK"));
        OWLNamedIndividual efisiensi = df.getOWLNamedIndividual(IRI.create(KTN + "EfisiensiRugi"));

        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(pekerja, kasusPekerja));
        manager.addAxiom(kasus, df.getOWLClassAssertionAxiom(phkClass, kasusPhk));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(mengalami, kasusPekerja, kasusPhk));
        manager.addAxiom(kasus, df.getOWLObjectPropertyAssertionAxiom(alasanProp, kasusPhk, efisiensi));
        manager.addAxiom(kasus, df.getOWLDataPropertyAssertionAxiom(upah, kasusPekerja,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));

        SWRLVariable p = df.getSWRLVariable(IRI.create(KTN + "p"));
        SWRLVariable phk = df.getSWRLVariable(IRI.create(KTN + "phk"));
        SWRLVariable alasan = df.getSWRLVariable(IRI.create(KTN + "alasan"));
        SWRLVariable u = df.getSWRLVariable(IRI.create(KTN + "u"));
        SWRLVariable f = df.getSWRLVariable(IRI.create(KTN + "f"));
        SWRLVariable n = df.getSWRLVariable(IRI.create(KTN + "n"));

        List<SWRLDArgument> args = List.of(n, u, f);
        Set<SWRLAtom> body = Set.of(
                df.getSWRLClassAtom(pekerja, p),
                df.getSWRLObjectPropertyAtom(mengalami, p, phk),
                df.getSWRLObjectPropertyAtom(alasanProp, phk, alasan),
                df.getSWRLDataPropertyAtom(pengali, alasan, f),
                df.getSWRLDataPropertyAtom(upah, p, u),
                df.getSWRLBuiltInAtom(IRI.create(SWRLB + "multiply"), args));
        Set<SWRLAtom> head = Set.of(df.getSWRLDataPropertyAtom(nominal, p, n));
        manager.addAxiom(kasus, df.getSWRLRule(body, head));

        OpenlletReasoner reasoner = OpenlletReasonerFactory.getInstance().createReasoner(kasus);
        reasoner.precomputeInferences(
                InferenceType.CLASS_ASSERTIONS,
                InferenceType.DATA_PROPERTY_ASSERTIONS);

        Set<OWLLiteral> nilai = reasoner.getDataPropertyValues(kasusPekerja, nominal);

        assertFalse(nilai.isEmpty(), "SWRL tidak menghasilkan nominalPesangon");
        BigDecimal hasil = new BigDecimal(nilai.iterator().next().getLiteral());
        assertEquals(0, new BigDecimal("2500000").compareTo(hasil), "hasil: " + nilai);
    }
}
