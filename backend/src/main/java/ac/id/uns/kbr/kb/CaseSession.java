package ac.id.uns.kbr.kb;

import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.reasoner.InferenceType;

import openllet.owlapi.OpenlletReasoner;
import openllet.owlapi.OpenlletReasonerFactory;

public class CaseSession implements AutoCloseable {

    private final OWLOntologyManager manager;
    private final OWLDataFactory df;
    private final OWLOntology kasus;
    private OpenlletReasoner reasoner;

    public CaseSession(OWLOntologyManager manager, OWLDataFactory df, OWLOntology kasus) {
        this.manager = manager;
        this.df = df;
        this.kasus = kasus;
    }

    public OWLOntologyManager manager() {
        return manager;
    }

    public OWLDataFactory df() {
        return df;
    }

    public OWLOntology kasus() {
        return kasus;
    }

    public OpenlletReasoner reasoner() {
        if (reasoner == null) {
            reasoner = OpenlletReasonerFactory.getInstance().createReasoner(kasus);
            reasoner.precomputeInferences(
                    InferenceType.CLASS_ASSERTIONS,
                    InferenceType.DATA_PROPERTY_ASSERTIONS);
        }
        return reasoner;
    }

    @Override
    public void close() {
        if (reasoner != null) {
            reasoner.dispose();
        }
        manager.removeOntology(kasus);
    }
}
