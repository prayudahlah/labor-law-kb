package ac.id.uns.kbr.api.error;

import java.util.List;
import java.util.Map;

public record ValidationError(
        String type,
        List<String> loc,
        String msg,
        Object input,
        Map<String, Object> ctx) {
}
