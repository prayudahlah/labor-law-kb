package ac.id.uns.kbr.kb;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

public final class OntologyCatalog {

    public record Entry(String id, String iri, Path file) {
    }

    private static final String KATALOG = "catalog-v001.xml";
    private static final String ENTRY_KB = "kb";

    private OntologyCatalog() {
    }

    public static List<Entry> baca(Path ontologyDir) throws Exception {
        Path dir = ontologyDir.toAbsolutePath().normalize();
        Path katalog = dir.resolve(KATALOG);
        if (!Files.exists(katalog)) {
            throw new IllegalStateException("Katalog ontology tidak ditemukan: " + katalog);
        }

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        Document dokumen = factory.newDocumentBuilder().parse(katalog.toFile());

        NodeList daftar = dokumen.getElementsByTagName("uri");
        List<Entry> entries = new ArrayList<>();
        for (int i = 0; i < daftar.getLength(); i++) {
            Element entry = (Element) daftar.item(i);
            Path berkas = dir.resolve(entry.getAttribute("uri")).normalize();
            if (!berkas.startsWith(dir)) {
                throw new IllegalStateException(
                        "Katalog menunjuk ke luar folder ontology: " + berkas);
            }
            entries.add(new Entry(
                    entry.getAttribute("id"),
                    entry.getAttribute("name"),
                    berkas));
        }
        return entries;
    }

    public static Path entryPoint(List<Entry> entries) {
        return entries.stream()
                .filter(entry -> ENTRY_KB.equals(entry.id()))
                .map(Entry::file)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Katalog tidak punya entry id=\"" + ENTRY_KB + "\""));
    }
}
