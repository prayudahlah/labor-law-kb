package ac.id.uns.kbr.api.dto;

import java.util.List;
import java.util.Map;

public record ChatResponse(
        String mode,
        String pesan,
        String pertanyaan,
        List<String> pilihan,
        List<String> kurang,
        Map<String, Object> scope,
        List<String> hak,
        Map<String, Object> rincian,
        Double nominal,
        List<String> pasal,
        List<ButirKetentuan> butir,
        String narasi,
        Slot slot,
        Map<String, Object> state,
        String catatan) {
}
