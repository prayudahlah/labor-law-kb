package ac.id.uns.kbr.api;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.DokumenPreset;
import ac.id.uns.kbr.api.dto.KetentuanRequest;
import ac.id.uns.kbr.api.dto.KetentuanResponse;
import ac.id.uns.kbr.kb.NarasiService;
import ac.id.uns.kbr.kb.RetrievalService;

@RestController
public class KetentuanController {

    private static final String CATATAN = "Daftar ketentuan, bukan nasihat hukum.";

    private final RetrievalService retrieval;
    private final NarasiService narasi;

    public KetentuanController(RetrievalService retrieval, NarasiService narasi) {
        this.retrieval = retrieval;
        this.narasi = narasi;
    }

    @PostMapping("/ketentuan")
    public KetentuanResponse ketentuan(@RequestBody KetentuanRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("body wajib diisi");
        }
        boolean adaDokumen = request.dokumen() != null && !request.dokumen().isBlank();
        boolean adaTopik = request.topik() != null && !request.topik().isEmpty();
        if (!adaDokumen && !adaTopik) {
            throw new IllegalArgumentException("topik atau dokumen wajib diisi");
        }

        if (adaDokumen) {
            List<ButirKetentuan> butir = retrieval.cariDokumen(request.dokumen());
            String teks = narasi.retrievalDokumen(request.dokumen(), butir);
            return new KetentuanResponse(
                    "retrieval",
                    Map.of("dokumen", request.dokumen()),
                    butir,
                    teks,
                    CATATAN);
        }

        List<ButirKetentuan> butir = retrieval.cari(request.topik());
        String teks = narasi.retrieval(request.topik(), butir);
        return new KetentuanResponse(
                "retrieval",
                Map.of("topik", request.topik()),
                butir,
                teks,
                CATATAN);
    }

    @GetMapping("/ketentuan/dokumen")
    public List<DokumenPreset> dokumen() {
        return retrieval.daftarDokumen();
    }
}
