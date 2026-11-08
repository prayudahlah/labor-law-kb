package ac.id.uns.kbr.kb;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Stream;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLObjectProperty;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.search.EntitySearcher;

public final class OntologyValues {

    public static final String KTN = "https://example.org/kbr/ketenagakerjaan#";

    private OntologyValues() {
    }

    public static OWLNamedIndividual individual(OWLOntologyManager manager, String localName) {
        return manager.getOWLDataFactory().getOWLNamedIndividual(IRI.create(KTN + localName));
    }

    public static Stream<OWLLiteral> dataValues(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        OWLDataProperty p = manager.getOWLDataFactory().getOWLDataProperty(IRI.create(KTN + property));
        return manager.getOntologies().stream()
                .flatMap(o -> EntitySearcher.getDataPropertyValues(ind, p, o));
    }

    public static BigDecimal decimal(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        return dataValues(manager, ind, property)
                .findFirst()
                .map(lit -> new BigDecimal(lit.getLiteral()))
                .orElseThrow(() -> new IllegalStateException(
                        "Data property " + property + " tidak ditemukan pada " + ind.getIRI()));
    }

    public static Integer integer(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        return dataValues(manager, ind, property)
                .findFirst()
                .map(lit -> Integer.parseInt(lit.getLiteral()))
                .orElseThrow(() -> new IllegalStateException(
                        "Data property " + property + " tidak ditemukan pada " + ind.getIRI()));
    }

    public static Integer optionalInteger(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        return dataValues(manager, ind, property)
                .findFirst()
                .map(lit -> Integer.parseInt(lit.getLiteral()))
                .orElse(null);
    }

    public static Boolean bool(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        return dataValues(manager, ind, property)
                .findFirst()
                .map(lit -> Boolean.parseBoolean(lit.getLiteral()))
                .orElseThrow(() -> new IllegalStateException(
                        "Data property " + property + " tidak ditemukan pada " + ind.getIRI()));
    }

    public static String string(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        return dataValues(manager, ind, property)
                .findFirst()
                .map(OWLLiteral::getLiteral)
                .orElseThrow(() -> new IllegalStateException(
                        "Data property " + property + " tidak ditemukan pada " + ind.getIRI()));
    }

    public static OWLNamedIndividual object(
            OWLOntologyManager manager, OWLNamedIndividual ind, String property) {
        OWLObjectProperty p = manager.getOWLDataFactory().getOWLObjectProperty(IRI.create(KTN + property));
        return manager.getOntologies().stream()
                .flatMap(o -> EntitySearcher.getObjectPropertyValues(ind, p, o))
                .filter(OWLNamedIndividual.class::isInstance)
                .map(OWLNamedIndividual.class::cast)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Object property " + property + " tidak ditemukan pada " + ind.getIRI()));
    }

    public static List<OWLNamedIndividual> individuals(
            OWLOntologyManager manager, String className) {
        OWLClass c = manager.getOWLDataFactory().getOWLClass(IRI.create(KTN + className));
        return manager.getOntologies().stream()
                .flatMap(o -> EntitySearcher.getIndividuals(c, o))
                .filter(OWLNamedIndividual.class::isInstance)
                .map(OWLNamedIndividual.class::cast)
                .distinct()
                .toList();
    }
}
