package ac.id.uns.kbr.api.dto;

import java.util.List;
import java.util.Map;

public record KetentuanResponse(
        String mode,
        Map<String, Object> scope,
        List<ButirKetentuan> butir,
        String narasi,
        String catatan) {
}
