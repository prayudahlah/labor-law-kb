package ac.id.uns.kbr.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kb")
public record KbProperties(String ontologyDir, String dataDir) {
}
