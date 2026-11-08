package ac.id.uns.kbr.kb;

import java.util.Set;

import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.reasoner.OWLReasoner;

public interface CalculationProvider {

    CalculationResult hitung(
            String topik,
            OWLNamedIndividual kasus,
            OWLOntologyManager manager,
            OWLReasoner reasoner,
            Set<String> hak);
}
