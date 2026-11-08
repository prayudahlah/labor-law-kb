package ac.id.uns.kbr.kb;

import java.util.Set;

import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.reasoner.OWLReasoner;

public class AutoCalculationProvider implements CalculationProvider {

    private final String mode;
    private final SwrlCalculationProvider swrl;
    private final JavaCalculationProvider javaProvider;

    public AutoCalculationProvider(
            String mode,
            SwrlCalculationProvider swrl,
            JavaCalculationProvider javaProvider) {
        this.mode = mode == null || mode.isBlank() ? "auto" : mode.toLowerCase();
        this.swrl = swrl;
        this.javaProvider = javaProvider;
    }

    @Override
    public CalculationResult hitung(
            String topik,
            OWLNamedIndividual kasus,
            OWLOntologyManager manager,
            OWLReasoner reasoner,
            Set<String> hak) {
        return switch (mode) {
            case "java" -> javaProvider.hitung(topik, kasus, manager, reasoner, hak);
            case "swrl" -> swrl.hitung(topik, kasus, manager, reasoner, hak)
                    .orElseThrow(() -> new IllegalStateException(
                            "Output SWRL belum tersedia untuk topik " + topik));
            default -> swrl.hitung(topik, kasus, manager, reasoner, hak)
                    .orElseGet(() -> javaProvider.hitung(topik, kasus, manager, reasoner, hak));
        };
    }
}
