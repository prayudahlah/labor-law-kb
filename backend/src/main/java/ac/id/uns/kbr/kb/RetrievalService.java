package ac.id.uns.kbr.kb;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLAnnotationProperty;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLObjectProperty;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.search.EntitySearcher;
import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.ButirKetentuan;

@Service
public class RetrievalService {

    private static final String OWL_NAMED_INDIVIDUAL =
            "http://www.w3.org/2002/07/owl#NamedIndividual";

    private final OntologyService ontology;

    public RetrievalService(OntologyService ontology) {
        this.ontology = ontology;
    }

    public List<String> topikTersedia() {
        OWLClass topik = ontology.manager().getOWLDataFactory()
                .getOWLClass(IRI.create(OntologyValues.KTN + "Topik"));
        return EntitySearcher.getIndividuals(topik, ontology.modul())
                .filter(OWLNamedIndividual.class::isInstance)
                .map(individu -> ((OWLNamedIndividual) individu).getIRI().getFragment())
                .map(fragment -> fragment.startsWith("Topik")
                        ? fragment.substring("Topik".length())
                        : fragment)
                .sorted()
                .toList();
    }

    public List<ButirKetentuan> cari(List<String> topik) {
        Set<String> tersedia = new HashSet<>(topikTersedia());
        List<String> tidakDikenal = topik.stream()
                .filter(item -> !tersedia.contains(item))
                .toList();
        if (!tidakDikenal.isEmpty()) {
            throw new IllegalArgumentException(
                    "topik tidak dikenal: " + String.join(", ", tidakDikenal));
        }

        Set<IRI> topikIri = topik.stream()
                .map(item -> IRI.create(OntologyValues.KTN + "Topik" + item))
                .collect(Collectors.toSet());
        OWLObjectProperty berkaitan = ontology.manager().getOWLDataFactory()
                .getOWLObjectProperty(IRI.create(OntologyValues.KTN + "berkaitanTopik"));

        List<ButirKetentuan> hasil = new ArrayList<>();
        for (OWLOntology o : ontology.modul().toList()) {
            for (OWLNamedIndividual individu : o.getIndividualsInSignature()) {
                Set<IRI> kaitan = EntitySearcher.getObjectPropertyValues(individu, berkaitan, o)
                        .filter(OWLNamedIndividual.class::isInstance)
                        .map(item -> ((OWLNamedIndividual) item).getIRI())
                        .collect(Collectors.toSet());
                if (Collections.disjoint(kaitan, topikIri)) {
                    continue;
                }

                OWLAnnotationProperty pasalProp = ontology.manager().getOWLDataFactory()
                        .getOWLAnnotationProperty(IRI.create(OntologyValues.KTN + "pasal"));
                String pasal = EntitySearcher.getAnnotations(individu, o, pasalProp)
                        .map(annotation -> annotation.getValue().asLiteral()
                                .map(OWLLiteral::getLiteral).orElse(""))
                        .findFirst()
                        .orElse("");
                String topikLabel = topik.stream()
                        .filter(item -> kaitan.contains(
                                IRI.create(OntologyValues.KTN + "Topik" + item)))
                        .findFirst()
                        .orElse(topik.get(0));

                EntitySearcher.getTypes(individu, o)
                        .filter(OWLClass.class::isInstance)
                        .map(OWLClass.class::cast)
                        .filter(jenis -> !jenis.isOWLThing())
                        .filter(jenis -> !jenis.getIRI().toString().equals(OWL_NAMED_INDIVIDUAL))
                        .forEach(jenis -> hasil.add(new ButirKetentuan(
                                topikLabel,
                                jenis.getIRI().getFragment(),
                                pasal,
                                individu.getIRI().getFragment())));
            }
        }

        return hasil.stream()
                .distinct()
                .sorted(Comparator.comparing(ButirKetentuan::topik)
                        .thenComparing(ButirKetentuan::pasal))
                .toList();
    }
}
