package ac.id.uns.kbr.kb;

import java.nio.file.Files;
import java.nio.file.Path;

import javax.xml.parsers.DocumentBuilderFactory;

import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.util.SimpleIRIMapper;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

public final class OntologyLoader {

    private static final String KATALOG = "catalog-v001.xml";
    private static final String ENTRY_KB = "kb";

    private OntologyLoader() {
    }

    public static OWLOntology load(Path ontologyDir) throws Exception {
        Path dir = ontologyDir.toAbsolutePath().normalize();
        OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
        Path top = daftarkan(manager, dir);
        return manager.loadOntologyFromOntologyDocument(top.toFile());
    }

    private static Path daftarkan(OWLOntologyManager manager, Path dir) throws Exception {
        Path katalog = dir.resolve(KATALOG);
        if (!Files.exists(katalog)) {
            throw new IllegalStateException("Katalog ontology tidak ditemukan: " + katalog);
        }

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        Document dokumen = factory.newDocumentBuilder().parse(katalog.toFile());

        NodeList daftar = dokumen.getElementsByTagName("uri");
        Path top = null;
        for (int i = 0; i < daftar.getLength(); i++) {
            Element entry = (Element) daftar.item(i);
            Path berkas = dir.resolve(entry.getAttribute("uri")).normalize();
            if (!berkas.startsWith(dir)) {
                throw new IllegalStateException(
                        "Katalog menunjuk ke luar folder ontology: " + berkas);
            }
            manager.getIRIMappers().add(new SimpleIRIMapper(
                    IRI.create(entry.getAttribute("name")),
                    IRI.create(berkas.toUri())));
            if (ENTRY_KB.equals(entry.getAttribute("id"))) {
                top = berkas;
            }
        }

        if (top == null) {
            throw new IllegalStateException(
                    "Katalog tidak punya entry id=\"" + ENTRY_KB + "\": " + katalog);
        }
        return top;
    }
}
