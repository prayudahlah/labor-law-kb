package ac.id.uns.kbr.api;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.KetentuanRequest;
import ac.id.uns.kbr.api.dto.KetentuanResponse;
import ac.id.uns.kbr.kb.NarasiService;
import ac.id.uns.kbr.kb.RetrievalService;

@RestController
public class KetentuanController {

    private final RetrievalService retrieval;
    private final NarasiService narasi;

    public KetentuanController(RetrievalService retrieval, NarasiService narasi) {
        this.retrieval = retrieval;
        this.narasi = narasi;
    }

    @PostMapping("/ketentuan")
    public KetentuanResponse ketentuan(@RequestBody KetentuanRequest request) {
        if (request == null || request.topik() == null || request.topik().isEmpty()) {
            throw new IllegalArgumentException("topik wajib diisi");
        }
        List<ButirKetentuan> butir = retrieval.cari(request.topik());
        String teks = narasi.retrieval(request.topik(), butir);
        return new KetentuanResponse(
                "retrieval",
                Map.of("topik", request.topik()),
                butir,
                teks,
                "Daftar ketentuan, bukan nasihat hukum.");
    }
}
