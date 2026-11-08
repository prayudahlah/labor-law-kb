package ac.id.uns.kbr.api.dto;

import java.util.List;
import java.util.Map;

public record InferResponse(
        String mode,
        List<String> hak,
        Map<String, Object> rincian,
        Double nominal,
        List<String> pasal,
        String narasi,
        String catatan) {
}
