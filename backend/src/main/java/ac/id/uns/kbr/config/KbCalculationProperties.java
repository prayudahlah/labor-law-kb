package ac.id.uns.kbr.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kb.calculation")
public record KbCalculationProperties(String mode) {

    public KbCalculationProperties {
        if (mode == null || mode.isBlank()) {
            mode = "auto";
        }
    }
}
