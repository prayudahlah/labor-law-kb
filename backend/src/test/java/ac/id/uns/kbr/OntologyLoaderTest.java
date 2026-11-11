package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLOntology;

import ac.id.uns.kbr.kb.OntologyLoader;

class OntologyLoaderTest {

    private static final String KTN = "https://example.org/kbr/ketenagakerjaan#";

    @Test
    void memuatKbLewatKatalog() throws Exception {
        Path dir = Path.of(System.getProperty("kb.ontology-dir", "../ontology"))
                .toAbsolutePath()
                .normalize();
        OWLOntology kb = OntologyLoader.load(dir);

        assertEquals("https://example.org/kbr/ketenagakerjaan/kb",
                kb.getOntologyID().getOntologyIRI().orElseThrow().toString());
        assertTrue(kb.getImportsClosure().stream().anyMatch(onto ->
                onto.containsClassInSignature(IRI.create(KTN + "Pekerja"))),
                "kelas Pekerja tidak ditemukan");
        assertTrue(kb.getImportsClosure().stream().anyMatch(onto ->
                onto.containsIndividualInSignature(IRI.create(KTN + "BatasJangkaWaktuPKWT"))),
                "individu norma tidak ditemukan");
    }
}
