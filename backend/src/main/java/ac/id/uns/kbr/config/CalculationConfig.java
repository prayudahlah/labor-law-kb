package ac.id.uns.kbr.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import ac.id.uns.kbr.kb.AutoCalculationProvider;
import ac.id.uns.kbr.kb.CalculationProvider;
import ac.id.uns.kbr.kb.JavaCalculationProvider;
import ac.id.uns.kbr.kb.SwrlCalculationProvider;

@Configuration
public class CalculationConfig {

    @Bean
    public CalculationProvider calculationProvider(KbCalculationProperties properties) {
        return new AutoCalculationProvider(
                properties.mode(),
                new SwrlCalculationProvider(),
                new JavaCalculationProvider());
    }
}
