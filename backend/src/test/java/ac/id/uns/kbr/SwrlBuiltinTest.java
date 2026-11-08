package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.model.SWRLAtom;
import org.semanticweb.owlapi.model.SWRLDArgument;
import org.semanticweb.owlapi.model.SWRLRule;
import org.semanticweb.owlapi.model.SWRLVariable;
import org.semanticweb.owlapi.reasoner.InferenceType;
import org.semanticweb.owlapi.vocab.OWL2Datatype;

import openllet.owlapi.OpenlletReasoner;
import openllet.owlapi.OpenlletReasonerFactory;

class SwrlBuiltinTest {

    private static final String NS = "https://example.org/kbr/uji#";
    private static final String SWRLB = "http://www.w3.org/2003/11/swrlb#";

    @Test
    void swrlbMultiplyDieksekusiOpenllet() throws Exception {
        OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
        OWLDataFactory df = manager.getOWLDataFactory();
        OWLOntology onto = manager.createOntology(IRI.create(NS + "uji"));

        OWLClass pekerja = df.getOWLClass(IRI.create(NS + "Pekerja"));
        OWLDataProperty upah = df.getOWLDataProperty(IRI.create(NS + "upahBulanan"));
        OWLDataProperty faktor = df.getOWLDataProperty(IRI.create(NS + "faktor"));
        OWLDataProperty nominal = df.getOWLDataProperty(IRI.create(NS + "nominal"));
        OWLNamedIndividual uji = df.getOWLNamedIndividual(IRI.create(NS + "Uji"));

        manager.addAxiom(onto, df.getOWLDeclarationAxiom(pekerja));
        manager.addAxiom(onto, df.getOWLDeclarationAxiom(upah));
        manager.addAxiom(onto, df.getOWLDeclarationAxiom(faktor));
        manager.addAxiom(onto, df.getOWLDeclarationAxiom(nominal));
        manager.addAxiom(onto, df.getOWLClassAssertionAxiom(pekerja, uji));
        manager.addAxiom(onto, df.getOWLDataPropertyAssertionAxiom(upah, uji,
                df.getOWLLiteral("5000000", OWL2Datatype.XSD_DECIMAL)));
        manager.addAxiom(onto, df.getOWLDataPropertyAssertionAxiom(faktor, uji,
                df.getOWLLiteral("0.5", OWL2Datatype.XSD_DECIMAL)));

        SWRLVariable p = df.getSWRLVariable(IRI.create(NS + "p"));
        SWRLVariable u = df.getSWRLVariable(IRI.create(NS + "u"));
        SWRLVariable f = df.getSWRLVariable(IRI.create(NS + "f"));
        SWRLVariable n = df.getSWRLVariable(IRI.create(NS + "n"));

        List<SWRLDArgument> args = List.of(n, u, f);
        Set<SWRLAtom> body = Set.of(
                df.getSWRLClassAtom(pekerja, p),
                df.getSWRLDataPropertyAtom(upah, p, u),
                df.getSWRLDataPropertyAtom(faktor, p, f),
                df.getSWRLBuiltInAtom(IRI.create(SWRLB + "multiply"), args));
        Set<SWRLAtom> head = Set.of(df.getSWRLDataPropertyAtom(nominal, p, n));
        manager.addAxiom(onto, df.getSWRLRule(body, head));

        OpenlletReasoner reasoner = OpenlletReasonerFactory.getInstance().createReasoner(onto);
        reasoner.precomputeInferences(
                InferenceType.CLASS_ASSERTIONS,
                InferenceType.DATA_PROPERTY_ASSERTIONS);

        Set<OWLLiteral> nilai = reasoner.getDataPropertyValues(uji, nominal);

        assertFalse(nilai.isEmpty(), "SWRL tidak menghasilkan nilai");
        BigDecimal hasil = new BigDecimal(nilai.iterator().next().getLiteral());
        assertEquals(0, new BigDecimal("2500000").compareTo(hasil), "hasil: " + nilai);
    }
}
