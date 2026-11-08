package ac.id.uns.kbr.api;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import ac.id.uns.kbr.api.dto.DokumenRequest;
import ac.id.uns.kbr.api.dto.DokumenResponse;
import ac.id.uns.kbr.kb.DokumenService;

@RestController
public class DokumenController {

    private final DokumenService dokumen;

    public DokumenController(DokumenService dokumen) {
        this.dokumen = dokumen;
    }

    @PostMapping("/dokumen")
    public DokumenResponse buat(@RequestBody DokumenRequest request) {
        return dokumen.buat(request);
    }
}
