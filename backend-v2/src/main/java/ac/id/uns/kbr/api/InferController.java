package ac.id.uns.kbr.api;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import ac.id.uns.kbr.api.dto.InferRequest;
import ac.id.uns.kbr.api.dto.InferResponse;
import ac.id.uns.kbr.kb.InferenceService;

@RestController
public class InferController {

    private final InferenceService inference;

    public InferController(InferenceService inference) {
        this.inference = inference;
    }

    @PostMapping("/infer")
    public InferResponse infer(@RequestBody InferRequest request) {
        return inference.infer(request);
    }
}
