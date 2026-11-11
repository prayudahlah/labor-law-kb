package ac.id.uns.kbr.kb;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.search.EntitySearcher;
import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.DokumenPreset;

@Service
public class RetrievalService {

    private final OntologyService ontology;
    private final SparqlService sparql;

    public RetrievalService(OntologyService ontology, SparqlService sparql) {
        this.ontology = ontology;
        this.sparql = sparql;
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
        return sparql.cariTopik(topik);
    }

    public List<ButirKetentuan> cariDokumen(String dokumen) {
        boolean ada = daftarDokumen().stream()
                .anyMatch(item -> item.id().equals(dokumen));
        if (!ada) {
            throw new IllegalArgumentException("dokumen tidak dikenal: " + dokumen);
        }
        return sparql.cariDokumen(dokumen);
    }

    public List<DokumenPreset> daftarDokumen() {
        return sparql.daftarDokumen();
    }
}
