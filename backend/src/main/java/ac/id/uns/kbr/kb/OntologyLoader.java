package ac.id.uns.kbr.kb;

import java.nio.file.Path;
import java.util.List;

import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.util.SimpleIRIMapper;

public final class OntologyLoader {

    private OntologyLoader() {
    }

    public static OWLOntology load(Path ontologyDir) throws Exception {
        Path dir = ontologyDir.toAbsolutePath().normalize();
        List<OntologyCatalog.Entry> entries = OntologyCatalog.baca(dir);
        OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
        for (OntologyCatalog.Entry entry : entries) {
            manager.getIRIMappers().add(new SimpleIRIMapper(
                    IRI.create(entry.iri()),
                    IRI.create(entry.file().toUri())));
        }
        return manager.loadOntologyFromOntologyDocument(
                OntologyCatalog.entryPoint(entries).toFile());
    }
}
