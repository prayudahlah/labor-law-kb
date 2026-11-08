package ac.id.uns.kbr.api.dto;

import java.util.List;

public record DokumenResponse(
        String mode,
        String dokumen,
        String judul,
        List<DokumenButir> wajib,
        List<DokumenButir> opsional,
        String template,
        List<String> pasal,
        String catatan) {
}
