package ac.id.uns.kbr.kb;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.DokumenButir;
import ac.id.uns.kbr.api.dto.DokumenRequest;
import ac.id.uns.kbr.api.dto.DokumenResponse;
import jakarta.annotation.PostConstruct;

@Service
public class DokumenService {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([a-zA-Z0-9_]+)}");

    private final RetrievalService retrieval;
    private Map<String, Object> root;

    public DokumenService(RetrievalService retrieval) {
        this.retrieval = retrieval;
    }

    @PostConstruct
    public void muat() throws IOException {
        try (InputStream input = new ClassPathResource(
                "dokumen/peraturan-perusahaan.yml").getInputStream()) {
            root = new Yaml().load(input);
        }
    }

    public DokumenResponse buat(DokumenRequest request) {
        String kode = asString(root.get("kode"));
        if (request == null || request.dokumen() == null || !request.dokumen().equals(kode)) {
            throw new IllegalArgumentException("dokumen tidak didukung: "
                    + (request == null ? null : request.dokumen()));
        }
        List<String> filter = request.topik() == null ? List.of() : request.topik();
        Map<String, Object> fakta = request.fakta() == null ? Map.of() : request.fakta();

        List<DokumenButir> wajib = new ArrayList<>();
        List<DokumenButir> opsional = new ArrayList<>();

        for (Map<String, Object> bagian : asList(root.get("bagian"))) {
            String judulBagian = asString(bagian.get("judul"));
            int urutan = asInt(bagian.get("urutan"));
            for (Map<String, Object> klausul : asList(bagian.get("klausul"))) {
                List<String> topik = asStringList(klausul.get("topik"));
                if (!filter.isEmpty() && topik.stream().noneMatch(filter::contains)) {
                    continue;
                }
                boolean wajibKlausul = asBool(klausul.get("wajib"));
                String template = asString(klausul.get("template"));
                List<ButirKetentuan> butir = topik.stream()
                        .flatMap(item -> retrieval.cari(List.of(item)).stream())
                        .distinct()
                        .toList();
                DokumenButir hasil = new DokumenButir(
                        judulBagian, urutan, topik, wajibKlausul, template, butir);
                if (wajibKlausul) {
                    wajib.add(hasil);
                } else {
                    opsional.add(hasil);
                }
            }
        }

        if (wajib.isEmpty() && opsional.isEmpty()) {
            throw new IllegalArgumentException("tidak ada klausul untuk topik yang diminta");
        }

        Set<String> pasal = new LinkedHashSet<>();
        wajib.forEach(item -> item.butir().stream()
                .map(ButirKetentuan::pasal)
                .filter(text -> !text.isBlank())
                .forEach(pasal::add));
        opsional.forEach(item -> item.butir().stream()
                .map(ButirKetentuan::pasal)
                .filter(text -> !text.isBlank())
                .forEach(pasal::add));

        List<DokumenButir> semua = new ArrayList<>(wajib);
        semua.addAll(opsional);
        semua.sort((a, b) -> Integer.compare(a.urutan(), b.urutan()));

        return new DokumenResponse(
                "dokumen",
                kode,
                asString(root.get("judul")),
                wajib,
                opsional,
                susunTemplate(semua, fakta),
                new ArrayList<>(pasal),
                "Draf, bukan nasihat hukum.");
    }

    private String susunTemplate(List<DokumenButir> semua, Map<String, Object> fakta) {
        StringBuilder draft = new StringBuilder();
        draft.append(fill(asString(root.get("header")), fakta)).append("\n\n");
        for (DokumenButir butir : semua) {
            draft.append("## ").append(butir.urutan()).append(". ")
                    .append(butir.bagian()).append("\n\n");
            draft.append(fill(butir.template(), fakta)).append("\n\n");
            String dasar = butir.butir().stream()
                    .map(ButirKetentuan::pasal)
                    .filter(text -> !text.isBlank())
                    .distinct()
                    .collect(Collectors.joining("; "));
            if (!dasar.isBlank()) {
                draft.append("Dasar: ").append(dasar).append("\n\n");
            }
        }
        return draft.toString().strip();
    }

    private static String fill(String teks, Map<String, Object> fakta) {
        Matcher matcher = PLACEHOLDER.matcher(teks == null ? "" : teks);
        StringBuilder hasil = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            Object nilai = fakta.get(key);
            String isi = nilai == null ? "[" + key + "]" : nilai.toString();
            matcher.appendReplacement(hasil, Matcher.quoteReplacement(isi));
        }
        matcher.appendTail(hasil);
        return hasil.toString();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asList(Object value) {
        if (value instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
    }

    private static List<String> asStringList(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of();
    }

    private static String asString(Object value) {
        return value == null ? "" : value.toString();
    }

    private static int asInt(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static boolean asBool(Object value) {
        return value instanceof Boolean bool && bool;
    }
}
