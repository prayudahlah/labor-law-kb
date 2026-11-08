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
    public JavaCalculationProvider javaCalculationProvider() {
        return new JavaCalculationProvider();
    }

    @Bean
    public SwrlCalculationProvider swrlCalculationProvider() {
        return new SwrlCalculationProvider();
    }

    @Bean
    public CalculationProvider calculationProvider(
            KbCalculationProperties properties,
            JavaCalculationProvider javaProvider,
            SwrlCalculationProvider swrlProvider) {
        return new AutoCalculationProvider(properties.mode(), swrlProvider, javaProvider);
    }
}
