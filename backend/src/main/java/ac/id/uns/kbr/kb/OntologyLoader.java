package ac.id.uns.kbr.kb;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.util.SimpleIRIMapper;

public final class OntologyLoader {

    private static final Pattern ONTOLOGY_IRI =
            Pattern.compile("(?m)^<([^>]+)>\\s+a\\s+owl:Ontology");

    private OntologyLoader() {
    }

    public static OWLOntology load(Path ontologyDir) throws Exception {
        OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
        try (Stream<Path> files = Files.walk(ontologyDir)) {
            files.filter(path -> path.toString().endsWith(".ttl"))
                    .forEach(path -> register(manager, path));
        }
        return manager.loadOntologyFromOntologyDocument(
                ontologyDir.resolve("ontology.ttl").toFile());
    }

    private static void register(OWLOntologyManager manager, Path file) {
        try {
            String text = Files.readString(file);
            Matcher matcher = ONTOLOGY_IRI.matcher(text);
            if (!matcher.find()) {
                return;
            }
            String iri = matcher.group(1);
            manager.getIRIMappers().add(
                    new SimpleIRIMapper(IRI.create(iri), IRI.create(file.toUri())));
        } catch (IOException exc) {
            throw new IllegalStateException("Gagal membaca " + file, exc);
        }
    }
}
