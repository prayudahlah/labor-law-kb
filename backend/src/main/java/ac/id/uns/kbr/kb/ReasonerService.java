package ac.id.uns.kbr.kb;

import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;

import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.springframework.stereotype.Service;

@Service
public class ReasonerService {

    private final OntologyService ontology;
    private final ReentrantLock lock = new ReentrantLock();

    public ReasonerService(OntologyService ontology) {
        this.ontology = ontology;
    }

    public <T> T denganKasus(Function<CaseSession, T> fn) {
        lock.lock();
        try (CaseSession session = buka()) {
            return fn.apply(session);
        } finally {
            lock.unlock();
        }
    }

    private CaseSession buka() {
        OWLOntologyManager manager = ontology.manager();
        OWLDataFactory df = manager.getOWLDataFactory();
        try {
            OWLOntology kasus = manager.createOntology(
                    IRI.create(OntologyValues.KTN + "Kasus" + UUID.randomUUID()));
            manager.applyChange(new AddImport(kasus, df.getOWLImportsDeclaration(
                    ontology.kb().getOntologyID().getOntologyIRI().orElseThrow())));
            return new CaseSession(manager, df, kasus);
        } catch (org.semanticweb.owlapi.model.OWLOntologyCreationException exc) {
            throw new IllegalStateException("Gagal membuat ontology kasus", exc);
        }
    }
}
