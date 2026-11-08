package ac.id.uns.kbr.kb;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;

import ac.id.uns.kbr.config.LlmProperties;

@Service
public class LlmClient {

    private final LlmProperties props;
    private final RestClient client;

    public LlmClient(LlmProperties props) {
        this.props = props;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    public boolean siap() {
        return props.siap();
    }

    public String modelRouter() {
        return props.modelRouter();
    }

    public String modelNarasi() {
        return props.modelNarasi();
    }

    public JsonNode chat(
            String model,
            List<Map<String, String>> messages,
            List<Map<String, Object>> tools) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
            body.put("tool_choice", "auto");
        }
        return client.post()
                .uri(props.baseUrl().replaceAll("/$", "") + "/chat/completions")
                .header("Authorization", "Bearer " + props.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }
}
