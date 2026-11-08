package ac.id.uns.kbr.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "llm")
public record LlmProperties(
        String baseUrl,
        String apiKey,
        String modelRouter,
        String modelNarasi) {

    public boolean siap() {
        return baseUrl != null && !baseUrl.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && modelRouter != null && !modelRouter.isBlank();
    }
}
