package ac.id.uns.kbr.api.dto;

import java.util.List;

public record DokumenButir(
        String bagian,
        int urutan,
        List<String> topik,
        boolean wajib,
        String template,
        List<ButirKetentuan> butir) {
}
