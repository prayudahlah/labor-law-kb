package ac.id.uns.kbr.kb;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.jena.query.ParameterizedSparqlString;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryExecution;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.QuerySolution;
import org.apache.jena.query.ResultSet;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.riot.RDFDataMgr;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.DokumenPreset;
import ac.id.uns.kbr.config.KbProperties;
import jakarta.annotation.PostConstruct;

@Service
public class SparqlService {

    private final KbProperties props;
    private Model model;
    private String queryTopik;
    private String queryDokumen;
    private String queryDokumenPreset;

    public SparqlService(KbProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void muat() throws Exception {
        Path dir = Path.of(props.ontologyDir()).toAbsolutePath().normalize();
        Model kb = ModelFactory.createDefaultModel();
        for (OntologyCatalog.Entry entry : OntologyCatalog.baca(dir)) {
            if ("test".equals(entry.id()) || entry.file().toString().contains("/examples/")) {
                continue;
            }
            RDFDataMgr.read(kb, entry.file().toUri().toString());
        }
        this.model = kb;
        this.queryTopik = bacaQuery("ketentuan-topik.rq");
        this.queryDokumen = bacaQuery("ketentuan-dokumen.rq");
        this.queryDokumenPreset = bacaQuery("dokumen-preset.rq");
    }

    public List<ButirKetentuan> cariTopik(List<String> topik) {
        String values = topik.stream()
                .map(item -> "ktn:Topik" + item)
                .collect(Collectors.joining(" "));
        Query query = QueryFactory.create(queryTopik.replace("__TOPIK__", values));
        return jalankan(query);
    }

    public List<ButirKetentuan> cariDokumen(String dokumen) {
        ParameterizedSparqlString query = new ParameterizedSparqlString(queryDokumen);
        query.setIri("dokumen", OntologyValues.KTN + dokumen);
        return jalankan(query.asQuery());
    }

    public List<DokumenPreset> daftarDokumen() {
        Query query = QueryFactory.create(queryDokumenPreset);
        List<DokumenPreset> hasil = new ArrayList<>();
        try (QueryExecution eksekusi = QueryExecutionFactory.create(query, model)) {
            ResultSet rs = eksekusi.execSelect();
            while (rs.hasNext()) {
                QuerySolution solusi = rs.next();
                hasil.add(new DokumenPreset(
                        fragment(solusi.getResource("dokumen")),
                        teks(solusi.get("nama")),
                        teks(solusi.get("deskripsi"))));
            }
        }
        return hasil;
    }

    private List<ButirKetentuan> jalankan(Query query) {
        Map<String, ButirKetentuan> unik = new LinkedHashMap<>();
        try (QueryExecution eksekusi = QueryExecutionFactory.create(query, model)) {
            ResultSet rs = eksekusi.execSelect();
            while (rs.hasNext()) {
                QuerySolution solusi = rs.next();
                String topik = teks(solusi.get("topik"));
                String jenis = fragment(solusi.getResource("jenis"));
                String pasal = teks(solusi.get("pasal"));
                String norma = fragment(solusi.getResource("norma"));
                Resource tautan = solusi.getResource("tautan");
                String kunci = topik + "|" + pasal + "|" + norma;
                unik.putIfAbsent(kunci, new ButirKetentuan(
                        topik, jenis, pasal, norma,
                        tautan == null ? null : tautan.getURI()));
            }
        }
        return unik.values().stream()
                .sorted(Comparator.comparing(ButirKetentuan::topik)
                        .thenComparing(ButirKetentuan::pasal))
                .toList();
    }

    private static String bacaQuery(String nama) throws IOException {
        try (InputStream input = new ClassPathResource("sparql/" + nama).getInputStream()) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String teks(RDFNode node) {
        return node != null && node.isLiteral() ? node.asLiteral().getString() : null;
    }

    private static String fragment(Resource resource) {
        if (resource == null || resource.getURI() == null) {
            return null;
        }
        String uri = resource.getURI();
        int hash = uri.lastIndexOf('#');
        if (hash >= 0) {
            return uri.substring(hash + 1);
        }
        int slash = uri.lastIndexOf('/');
        return slash >= 0 ? uri.substring(slash + 1) : uri;
    }
}
