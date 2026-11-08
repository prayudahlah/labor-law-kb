package ac.id.uns.kbr.api.dto;

import java.util.Map;

public record InferRequest(String topik, Map<String, Object> fakta) {
}
