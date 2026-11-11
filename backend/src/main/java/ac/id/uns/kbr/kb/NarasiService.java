package ac.id.uns.kbr.kb;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import ac.id.uns.kbr.api.dto.ButirKetentuan;

@Service
public class NarasiService {

    private final LlmClient client;
    private final ObjectMapper mapper;

    public NarasiService(LlmClient client, ObjectMapper mapper) {
        this.client = client;
        this.mapper = mapper;
    }

    public String inferensi(List<String> hak, CalculationResult hasil, List<String> pasal) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mode", "inferensi");
        payload.put("hak", hak);
        payload.put("rincian", hasil.rincian());
        payload.put("nominal", hasil.nominal());
        payload.put("pasal", pasal);
        payload.put("catatan", "Bukan nasihat hukum.");
        String llm = llmRapikan(payload);
        if (llm != null) {
            return llm;
        }

        String inti = "Berdasarkan data Anda, hak yang terpenuhi: "
                + (hak.isEmpty() ? "tidak ada" : String.join(", ", hak)) + ".";
        if (hasil.nominal() != null) {
            inti += " Perkiraan nominal " + rupiah(hasil.nominal()) + ".";
        } else if (hasil.rincian() != null && !hasil.rincian().isEmpty()) {
            inti += " Rincian: " + hasil.rincian().entrySet().stream()
                    .map(entry -> entry.getKey() + "=" + entry.getValue())
                    .collect(Collectors.joining(", ")) + ".";
        }
        if (!pasal.isEmpty()) {
            inti += " Dasar: " + String.join("; ", pasal) + ".";
        }
        return inti + " Bukan nasihat hukum.";
    }

    public String retrieval(List<String> topik, List<ButirKetentuan> butir) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mode", "retrieval");
        payload.put("scope", Map.of("topik", topik));
        payload.put("butir", butir);
        payload.put("catatan", "Daftar ketentuan, bukan nasihat hukum.");
        String llm = llmRapikan(payload);
        if (llm != null) {
            return llm;
        }

        if (butir.isEmpty()) {
            return "Tidak ada ketentuan ditemukan untuk topik "
                    + String.join(", ", topik) + ".";
        }
        String contoh = butir.stream().limit(4)
                .map(ButirKetentuan::pasal)
                .collect(Collectors.joining("; "));
        return "Terdapat " + butir.size() + " ketentuan untuk topik "
                + String.join(", ", topik) + ". Contoh dasar: " + contoh
                + ". Daftar ketentuan, bukan nasihat hukum.";
    }

    public String retrievalDokumen(String dokumen, List<ButirKetentuan> butir) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mode", "retrieval");
        payload.put("scope", Map.of("dokumen", dokumen));
        payload.put("butir", butir);
        payload.put("catatan", "Daftar ketentuan, bukan nasihat hukum.");
        String llm = llmRapikan(payload);
        if (llm != null) {
            return llm;
        }

        if (butir.isEmpty()) {
            return "Tidak ada ketentuan ditemukan untuk dokumen " + dokumen + ".";
        }
        String contoh = butir.stream().limit(4)
                .map(ButirKetentuan::pasal)
                .collect(Collectors.joining("; "));
        return "Terdapat " + butir.size() + " ketentuan untuk dokumen " + dokumen
                + ". Contoh dasar: " + contoh
                + ". Daftar ketentuan, bukan nasihat hukum.";
    }

    private String llmRapikan(Map<String, Object> payload) {
        if (!client.siap() || client.modelNarasi() == null || client.modelNarasi().isBlank()) {
            return null;
        }
        try {
            String sistem = "Kamu merapikan jawaban hukum ketenagakerjaan dalam Bahasa Indonesia. "
                    + "Gunakan HANYA fakta pada JSON yang diberikan. Dilarang menambah fakta, "
                    + "pasal, atau angka baru. Sertakan sitasi pasal bila ada. Maksimal 4 kalimat.";
            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", sistem),
                    Map.of("role", "user", "content", mapper.writeValueAsString(payload)));
            JsonNode response = client.chat(client.modelNarasi(), messages, null);
            String teks = response.path("choices").path(0).path("message").path("content").asText("");
            return teks.isBlank() ? null : teks.strip();
        } catch (Exception exc) {
            return null;
        }
    }

    private static String rupiah(double nilai) {
        return "Rp" + String.format("%,.0f", nilai).replace(',', '.');
    }
}
