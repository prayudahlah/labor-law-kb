package ac.id.uns.kbr.api.dto;

import java.util.List;
import java.util.Map;

public record DokumenRequest(
        String sesi,
        String dokumen,
        List<String> topik,
        Map<String, Object> fakta) {
}
