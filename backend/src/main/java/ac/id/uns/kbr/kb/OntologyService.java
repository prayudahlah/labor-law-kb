package ac.id.uns.kbr.kb;

import java.nio.file.Path;
import java.util.stream.Stream;

import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.springframework.stereotype.Service;

import ac.id.uns.kbr.config.KbProperties;
import jakarta.annotation.PostConstruct;

@Service
public class OntologyService {

    private final KbProperties props;
    private OWLOntologyManager manager;
    private OWLOntology kb;

    public OntologyService(KbProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void muat() throws Exception {
        Path dir = Path.of(props.ontologyDir()).toAbsolutePath().normalize();
        this.kb = OntologyLoader.load(dir);
        this.manager = kb.getOWLOntologyManager();
    }

    public OWLOntologyManager manager() {
        return manager;
    }

    public OWLOntology kb() {
        return kb;
    }

    public Stream<OWLOntology> modul() {
        return kb.getImportsClosure().stream();
    }
}
