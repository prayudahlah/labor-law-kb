package ac.id.uns.kbr.kb;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import ac.id.uns.kbr.config.LlmProperties;

@Service
public class LlmRouter {

    private static final Logger log = LoggerFactory.getLogger(LlmRouter.class);

    public record Route(String mode, List<String> topik, Map<String, Object> fakta) {
    }

    private final LlmProperties props;
    private final Forms forms;
    private final ObjectMapper mapper;
    private final RestClient client;

    public LlmRouter(LlmProperties props, Forms forms, ObjectMapper mapper) {
        this.props = props;
        this.forms = forms;
        this.mapper = mapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    public Route route(String pesan, Map<String, Object> state) {
        if (!props.siap()) {
            return null;
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", props.modelRouter());
            body.put("messages", List.of(
                    Map.of("role", "system", "content", sistem(state)),
                    Map.of("role", "user", "content", pesan)));
            body.put("tools", tools());
            body.put("tool_choice", "auto");

            JsonNode response = client.post()
                    .uri(props.baseUrl().replaceAll("/$", "") + "/chat/completions")
                    .header("Authorization", "Bearer " + props.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode calls = response == null ? null
                    : response.path("choices").path(0).path("message").path("tool_calls");
            if (calls == null || !calls.isArray() || calls.isEmpty()) {
                return null;
            }

            String mode = null;
            List<String> topik = new ArrayList<>();
            Map<String, Object> fakta = new LinkedHashMap<>();
            for (JsonNode call : calls) {
                String nama = call.path("function").path("name").asText();
                JsonNode args = mapper.readTree(
                        call.path("function").path("arguments").asText("{}"));
                switch (nama) {
                    case "cari_ketentuan" -> {
                        mode = "retrieval";
                        args.path("topik").forEach(item -> topik.add(item.asText()));
                    }
                    case "isi_form" -> {
                        String field = args.path("field").asText();
                        Object nilai = forms.koersi(field, args.path("value").asText());
                        if (nilai != null) {
                            fakta.put(field, nilai);
                        }
                    }
                    case "klarifikasi" -> mode = "klarifikasi";
                    default -> {
                    }
                }
            }
            if (!fakta.isEmpty() && mode == null) {
                mode = "inferensi";
            }
            return new Route(mode, topik, fakta);
        } catch (Exception exc) {
            log.warn("LLM router gagal, fallback heuristik: {}: {}",
                    exc.getClass().getSimpleName(), exc.getMessage());
            return null;
        }
    }

    private String sistem(Map<String, Object> state) {
        return """
                Kamu router untuk sistem hukum ketenagakerjaan Indonesia. Pilih SATU mode lewat tool.
                Aturan:
                - Jika pengguna menceritakan situasi pribadi atau menanyakan haknya, panggil isi_form
                  untuk SEMUA data yang disebut.
                - Jika pengguna meminta DAFTAR aturan/ketentuan/syarat, panggil cari_ketentuan.
                - Jika maksud tidak jelas, panggil klarifikasi.
                - Jangan menulis query. Jangan memutuskan hukum.
                Field per topik: PHK: masaKerjaBulan, upahBulanan, bentukHubunganKerja, alasanPHK;
                Lembur: jamLembur, padaHariKerja, upahBulanan;
                Cuti: masaKerjaBulan, peristiwa, perempuan;
                PKWT: bentukHubunganKerja, masaKerjaBulan, upahBulanan;
                Jamsos: upahBulanan;
                KIA: sedangCutiMelahirkan, cutiMelahirkanBulan, upahBulanan.
                alasanPHK harus salah satu dari: EfisiensiRugi, MengundurkanDiri, Pensiun,
                MeninggalDunia, Pailit, Mangkir, PelanggaranSP.
                Ubah angka dalam kata menjadi angka.
                Konteks sesi: topik_infer=%s, fakta=%s, pending=%s.
                """.formatted(state.get("topik_infer"), state.get("fakta"), state.get("pending"));
    }

    private List<Map<String, Object>> tools() {
        Map<String, Object> isiForm = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "isi_form",
                        "description", "Isi satu field form untuk perhitungan hak.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "field", Map.of("type", "string"),
                                        "value", Map.of("type", "string")),
                                "required", List.of("field", "value"))));
        Map<String, Object> cari = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "cari_ketentuan",
                        "description", "Cari daftar ketentuan berdasarkan topik.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "topik", Map.of(
                                                "type", "array",
                                                "items", Map.of("type", "string"))),
                                "required", List.of("topik"))));
        Map<String, Object> klarifikasi = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "klarifikasi",
                        "description", "Ajukan pertanyaan klarifikasi.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "pertanyaan", Map.of("type", "string")),
                                "required", List.of("pertanyaan"))));
        return List.of(isiForm, cari, klarifikasi);
    }
}
